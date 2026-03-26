import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@arivarangam/db';
import { requireAuth } from '../middleware/auth';
import { creditService } from '../services/CreditService';
import { getConfig } from '@arivarangam/config';
import { getRedis } from '../redis';

// ─── Schemas ───────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions to create an account' }),
  }),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateToken(length = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomBytes = require('crypto').randomBytes(length);
  for (let i = 0; i < length; i++) {
    token += chars[randomBytes[i] % chars.length];
  }
  return token;
}

function signJWT(server: FastifyInstance, user: { id: string; email: string; tier: string; isAdmin: boolean }): string {
  return (server as any).jwt.sign(
    { email: user.email, tier: user.tier, isAdmin: user.isAdmin },
    { sub: user.id }
  );
}

function setCookieToken(reply: FastifyReply, token: string): void {
  reply.setCookie('arivarangam_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  // POST /signup
  fastify.post('/signup', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = signupSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => {
        errors[e.path.join('.')] = e.message;
      });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { name, email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return reply.code(409).send({ success: false, error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate email verification token
    const emailVerifyToken = generateToken();

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        emailVerifyToken,
        termsAcceptedAt: new Date(),
        status: 'ACTIVE',
        tier: 'FREE',
        credits: 0, // Will be set by signup bonus
      },
    });

    // Grant signup bonus
    await creditService.grantSignupBonus(user.id);

    // Log verification token (email sending is stubbed — log for dev purposes)
    console.log(`[Auth] Email verification token for ${normalizedEmail}: ${emailVerifyToken}`);
    console.log(`[Auth] Verification URL: ${getConfig().WEB_URL}/verify-email?token=${emailVerifyToken}`);

    // Sign JWT
    const token = signJWT(fastify, user);
    setCookieToken(reply, token);

    return reply.code(201).send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          tier: user.tier,
          credits: 100, // Just granted
          isAdmin: user.isAdmin,
          isEmailVerified: user.isEmailVerified,
        },
        message: 'Account created successfully. 100 welcome credits added!',
      },
    });
  });

  // POST /login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Invalid email or password format' });
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Generic error to prevent user enumeration
    const authError = { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' };

    if (!user) {
      return reply.code(401).send(authError);
    }

    if (user.status === 'DELETED') {
      return reply.code(401).send(authError);
    }

    if (user.status === 'SUSPENDED') {
      return reply.code(401).send({
        success: false,
        error: 'Your account has been suspended. Contact support for assistance.',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) {
      // Log failed auth attempt
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: 'FAILED_AUTH',
          severity: 'LOW',
          description: `Failed login attempt for ${normalizedEmail}`,
          ipAddress: request.ip,
        },
      }).catch(() => {}); // Non-fatal

      return reply.code(401).send(authError);
    }

    const token = signJWT(fastify, user);
    setCookieToken(reply, token);

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          tier: user.tier,
          credits: user.credits,
          isAdmin: user.isAdmin,
          isEmailVerified: user.isEmailVerified,
          status: user.status,
        },
      },
    });
  });

  // POST /logout
  fastify.post('/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('arivarangam_token', { path: '/' });
    return reply.send({ success: true, data: { message: 'Logged out successfully' } });
  });

  // POST /forgot-password
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = forgotPasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Invalid email address' });
    }

    const { email } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Always return success to prevent email enumeration
    const genericResponse = {
      success: true,
      data: { message: 'If an account with that email exists, we\'ve sent a password reset link.' },
    };

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || user.status !== 'ACTIVE') {
      return reply.send(genericResponse);
    }

    const resetToken = generateToken();
    const resetTokenExpiry = new Date(Date.now() + 3600 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry },
    });

    // Log reset token (email sending stubbed)
    console.log(`[Auth] Password reset token for ${normalizedEmail}: ${resetToken}`);
    console.log(`[Auth] Reset URL: ${getConfig().WEB_URL}/reset-password?token=${resetToken}`);

    return reply.send(genericResponse);
  });

  // POST /reset-password
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = resetPasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { token, password } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
        status: 'ACTIVE',
      },
    });

    if (!user) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid or expired reset token. Please request a new password reset.',
        code: 'INVALID_RESET_TOKEN',
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return reply.send({
      success: true,
      data: { message: 'Password reset successfully. You can now log in with your new password.' },
    });
  });

  // GET /me
  fastify.get('/me', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        tier: true,
        credits: true,
        totalCreditsUsed: true,
        isAdmin: true,
        isEmailVerified: true,
        status: true,
        termsAcceptedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!fullUser) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    return reply.send({ success: true, data: { user: fullUser } });
  });

  // POST /verify-email
  fastify.post('/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = verifyEmailSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Verification token is required' });
    }

    const { token } = parseResult.data;

    const user = await prisma.user.findFirst({
      where: { emailVerifyToken: token },
    });

    if (!user) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid verification token',
        code: 'INVALID_VERIFY_TOKEN',
      });
    }

    if (user.isEmailVerified) {
      return reply.send({
        success: true,
        data: { message: 'Email already verified' },
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
      },
    });

    return reply.send({
      success: true,
      data: { message: 'Email verified successfully!' },
    });
  });

  // ─── POST /admin-otp-send ──────────────────────────────────────────────────
  // Step 1 of admin 2FA: validate credentials, generate & store OTP

  fastify.post('/admin-otp-send', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = loginSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Invalid email or password' });
    }

    const { email, password } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    const authError = { success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' };

    if (!user || user.status !== 'ACTIVE') return reply.code(401).send(authError);
    if (!user.isAdmin) return reply.code(403).send({ success: false, error: 'Admin access required', code: 'NOT_ADMIN' });

    const passwordValid = await bcrypt.compare(password, user.password);
    if (!passwordValid) return reply.code(401).send(authError);

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const redis = getRedis();
    const otpKey = `admin:otp:${normalizedEmail}`;

    // Store OTP with 5-minute TTL
    await redis.set(otpKey, otp, 'EX', 300);

    // Stub: log OTP (replace with real email sending)
    console.log(`[Admin 2FA] OTP for ${normalizedEmail}: ${otp}`);
    console.log(`[Admin 2FA] OTP expires in 5 minutes`);

    return reply.send({
      success: true,
      data: { message: `OTP sent to ${normalizedEmail.replace(/(.{2}).*@/, '$1***@')}` },
    });
  });

  // ─── POST /admin-otp-verify ────────────────────────────────────────────────
  // Step 2 of admin 2FA: verify OTP and return JWT

  fastify.post('/admin-otp-verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      email: z.string().email(),
      otp: z.string().length(6, 'OTP must be 6 digits'),
    });

    const parseResult = schema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Invalid request' });
    }

    const { email, otp } = parseResult.data;
    const normalizedEmail = email.toLowerCase().trim();
    const redis = getRedis();
    const otpKey = `admin:otp:${normalizedEmail}`;

    const storedOtp = await redis.get(otpKey);

    if (!storedOtp) {
      return reply.code(400).send({ success: false, error: 'OTP expired or not requested. Please start again.', code: 'OTP_EXPIRED' });
    }

    if (storedOtp !== otp) {
      return reply.code(401).send({ success: false, error: 'Invalid OTP. Please check and try again.', code: 'INVALID_OTP' });
    }

    // OTP valid — delete it (single use)
    await redis.del(otpKey);

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user || !user.isAdmin) {
      return reply.code(403).send({ success: false, error: 'Admin access required' });
    }

    const token = signJWT(fastify, user);
    setCookieToken(reply, token);

    return reply.send({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          tier: user.tier,
          credits: user.credits,
          isAdmin: user.isAdmin,
          isEmailVerified: user.isEmailVerified,
        },
      },
    });
  });
}
