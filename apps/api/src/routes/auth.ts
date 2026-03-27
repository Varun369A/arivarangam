import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '@arivarangam/db'
import { requireAuth } from '../middleware/auth'
import { creditService } from '../services/CreditService'
import { getConfig } from '@arivarangam/config'
import { getRedis } from '../redis'
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendAdminOtpEmail,
  sendAdminNewUserNotification,
} from '../email'

// ─── Schemas ───────────────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomToken(length = 48): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = require('crypto').randomBytes(length)
  return Array.from({ length }, (_, i) => chars[bytes[i] % chars.length]).join('')
}

function signJWT(
  server: FastifyInstance,
  user: { id: string; email: string; tier: string; isAdmin: boolean }
): string {
  return (server as any).jwt.sign(
    { email: user.email, tier: user.tier, isAdmin: user.isAdmin },
    { sub: user.id }
  )
}

function setAuthCookie(reply: FastifyReply, token: string): void {
  reply.setCookie('arivarangam_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

function safeUser(user: {
  id: string; name: string; email: string; tier: string; credits: number;
  isAdmin: boolean; isEmailVerified: boolean; avatar?: string | null
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    tier: user.tier,
    credits: user.credits,
    isAdmin: user.isAdmin,
    isEmailVerified: user.isEmailVerified,
    avatarUrl: user.avatar ?? undefined,
  }
}

// ─── Plugin ───────────────────────────────────────────────────────────────────

export async function authRoutes(fastify: FastifyInstance): Promise<void> {

  // ── POST /signup ────────────────────────────────────────────────────────────
  fastify.post('/signup', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = signupSchema.safeParse(req.body)
    if (!parsed.success) {
      const details: Record<string, string> = {}
      parsed.error.errors.forEach(e => { details[e.path.join('.')] = e.message })
      return reply.code(400).send({ success: false, error: 'Validation failed', details })
    }

    const { name, email, password } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    const config = getConfig()

    // Duplicate email check
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return reply.code(409).send({
        success: false,
        error: 'An account with this email already exists.',
        code: 'EMAIL_EXISTS',
      })
    }

    const hashedPassword = await bcrypt.hash(password, 12)
    const emailVerifyToken = randomToken()

    // Create user — NOT verified yet, no credits until verification
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        emailVerifyToken,
        termsAcceptedAt: new Date(),
        status: 'ACTIVE',
        tier: 'FREE',
        credits: 0,
        isEmailVerified: false,
      },
    })

    // Send verification email (non-blocking)
    sendVerificationEmail(normalizedEmail, user.name, emailVerifyToken, config.WEB_URL).catch(() => {})

    // Notify admin (non-blocking)
    sendAdminNewUserNotification(config.ADMIN_EMAIL, {
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    }).catch(() => {})

    // Dev fallback — log token so you can verify without email
    console.log(`[Auth] Verification token for ${normalizedEmail}: ${emailVerifyToken}`)
    console.log(`[Auth] Verification URL: ${config.WEB_URL}/verify-email?token=${emailVerifyToken}`)

    return reply.code(201).send({
      success: true,
      data: {
        message: 'Account created! Please check your email to verify your address before signing in.',
        email: normalizedEmail,
      },
    })
  })

  // ── POST /login ─────────────────────────────────────────────────────────────
  fastify.post('/login', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid email or password format' })
    }

    const { email, password } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    const genericError = { success: false, error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' }

    if (!user || user.status === 'DELETED') {
      return reply.code(401).send(genericError)
    }

    if (user.status === 'SUSPENDED') {
      return reply.code(403).send({
        success: false,
        error: 'Your account has been suspended. Contact support.',
        code: 'ACCOUNT_SUSPENDED',
      })
    }

    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) {
      await prisma.securityEvent.create({
        data: {
          userId: user.id,
          type: 'FAILED_AUTH',
          severity: 'LOW',
          description: `Failed login for ${normalizedEmail}`,
          ipAddress: req.ip,
        },
      }).catch(() => {})
      return reply.code(401).send(genericError)
    }

    // Block unverified accounts
    if (!user.isEmailVerified) {
      return reply.code(403).send({
        success: false,
        error: 'Please verify your email address before signing in. Check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED',
        email: normalizedEmail,
      })
    }

    const token = signJWT(fastify, user)
    setAuthCookie(reply, token)

    return reply.send({
      success: true,
      data: { token, user: safeUser(user) },
    })
  })

  // ── POST /logout ────────────────────────────────────────────────────────────
  fastify.post('/logout', async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('arivarangam_token', { path: '/' })
    return reply.send({ success: true, data: { message: 'Logged out successfully' } })
  })

  // ── GET /me ─────────────────────────────────────────────────────────────────
  fastify.get('/me', { preHandler: requireAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const jwtUser = (req as any).user

    const user = await prisma.user.findUnique({
      where: { id: jwtUser.id },
      select: {
        id: true, name: true, email: true, avatar: true,
        tier: true, credits: true, totalCreditsUsed: true,
        isAdmin: true, isEmailVerified: true, status: true,
        termsAcceptedAt: true, createdAt: true, updatedAt: true,
      },
    })

    if (!user) return reply.code(404).send({ success: false, error: 'User not found' })

    return reply.send({ success: true, data: { user } })
  })

  // ── PATCH /me ───────────────────────────────────────────────────────────────
  fastify.patch('/me', { preHandler: requireAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const jwtUser = (req as any).user
    const schema = z.object({ name: z.string().min(2).max(100).optional() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Validation failed' })
    }

    const updated = await prisma.user.update({
      where: { id: jwtUser.id },
      data: parsed.data,
      select: {
        id: true, name: true, email: true, avatar: true,
        tier: true, credits: true, isAdmin: true, isEmailVerified: true,
      },
    })

    return reply.send({ success: true, data: { user: updated } })
  })

  // ── POST /me/change-password ─────────────────────────────────────────────────
  fastify.post('/me/change-password', { preHandler: requireAuth }, async (req: FastifyRequest, reply: FastifyReply) => {
    const jwtUser = (req as any).user
    const schema = z.object({
      oldPassword: z.string().min(1),
      newPassword: z.string().min(8).max(128),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Validation failed' })
    }

    const { oldPassword, newPassword } = parsed.data
    const user = await prisma.user.findUnique({ where: { id: jwtUser.id } })
    if (!user) return reply.code(404).send({ success: false, error: 'User not found' })

    const valid = await bcrypt.compare(oldPassword, user.password)
    if (!valid) return reply.code(401).send({ success: false, error: 'Current password is incorrect' })

    await prisma.user.update({
      where: { id: jwtUser.id },
      data: { password: await bcrypt.hash(newPassword, 12) },
    })

    return reply.send({ success: true, data: { message: 'Password changed successfully.' } })
  })

  // ── POST /verify-email ───────────────────────────────────────────────────────
  fastify.post('/verify-email', async (req: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ token: z.string().min(1) })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Verification token is required' })
    }

    const user = await prisma.user.findFirst({ where: { emailVerifyToken: parsed.data.token } })

    if (!user) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid or expired verification link. Please request a new one.',
        code: 'INVALID_TOKEN',
      })
    }

    if (user.isEmailVerified) {
      return reply.send({ success: true, data: { message: 'Email already verified. You can sign in.' } })
    }

    // Activate account
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true, emailVerifyToken: null },
    })

    // Grant signup bonus now that email is confirmed
    await creditService.grantSignupBonus(user.id).catch(() => {})

    return reply.send({
      success: true,
      data: { message: 'Email verified! Your account is now active. You can sign in.' },
    })
  })

  // ── POST /resend-verification ────────────────────────────────────────────────
  fastify.post('/resend-verification', async (req: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ email: z.string().email() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Valid email is required' })
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()
    const config = getConfig()
    // Generic response — don't leak whether email exists
    const ok = { success: true, data: { message: 'If this email is registered and unverified, we\'ve resent the verification link.' } }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || user.isEmailVerified) return reply.send(ok)

    // Generate fresh token
    const token = randomToken()
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifyToken: token } })

    sendVerificationEmail(normalizedEmail, user.name, token, config.WEB_URL).catch(() => {})
    console.log(`[Auth] Resent verification token for ${normalizedEmail}: ${token}`)

    return reply.send(ok)
  })

  // ── POST /forgot-password ────────────────────────────────────────────────────
  fastify.post('/forgot-password', async (req: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({ email: z.string().email() })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Valid email is required' })
    }

    const normalizedEmail = parsed.data.email.toLowerCase().trim()
    const config = getConfig()
    const ok = { success: true, data: { message: 'If an account with that email exists, we\'ve sent a reset link.' } }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || user.status !== 'ACTIVE') return reply.send(ok)

    const resetToken = randomToken()
    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken, resetTokenExpiry: new Date(Date.now() + 3600 * 1000) },
    })

    sendPasswordResetEmail(normalizedEmail, user.name, resetToken, config.WEB_URL).catch(() => {})
    console.log(`[Auth] Password reset token for ${normalizedEmail}: ${resetToken}`)

    return reply.send(ok)
  })

  // ── POST /reset-password ─────────────────────────────────────────────────────
  fastify.post('/reset-password', async (req: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      token: z.string().min(1),
      password: z.string().min(8).max(128),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      const details: Record<string, string> = {}
      parsed.error.errors.forEach(e => { details[e.path.join('.')] = e.message })
      return reply.code(400).send({ success: false, error: 'Validation failed', details })
    }

    const { token, password } = parsed.data

    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpiry: { gt: new Date() },
        status: 'ACTIVE',
      },
    })

    if (!user) {
      return reply.code(400).send({
        success: false,
        error: 'Invalid or expired reset link. Please request a new one.',
        code: 'INVALID_RESET_TOKEN',
      })
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 12),
        resetToken: null,
        resetTokenExpiry: null,
      },
    })

    return reply.send({ success: true, data: { message: 'Password reset successfully. You can now sign in.' } })
  })

  // ── POST /admin-otp-send ─────────────────────────────────────────────────────
  // Step 1: validate admin credentials → send OTP to admin email
  fastify.post('/admin-otp-send', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid email or password' })
    }

    const { email, password } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    const authError = { success: false, error: 'Invalid credentials', code: 'INVALID_CREDENTIALS' }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || user.status !== 'ACTIVE') return reply.code(401).send(authError)
    if (!user.isAdmin) return reply.code(403).send({ success: false, error: 'Admin access required', code: 'NOT_ADMIN' })

    const passwordValid = await bcrypt.compare(password, user.password)
    if (!passwordValid) return reply.code(401).send(authError)

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000))
    const redis = getRedis()
    await redis.set(`admin:otp:${normalizedEmail}`, otp, 'EX', 300)

    // Send OTP via email
    await sendAdminOtpEmail(normalizedEmail, otp)
    console.log(`[Admin 2FA] OTP for ${normalizedEmail}: ${otp}`)

    return reply.send({
      success: true,
      data: { message: `OTP sent to ${normalizedEmail.replace(/(.{2}).*@/, '$1***@')}` },
    })
  })

  // ── POST /admin-otp-verify ───────────────────────────────────────────────────
  // Step 2: verify OTP → return JWT
  fastify.post('/admin-otp-verify', async (req: FastifyRequest, reply: FastifyReply) => {
    const schema = z.object({
      email: z.string().email(),
      otp: z.string().length(6, 'OTP must be 6 digits'),
    })
    const parsed = schema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ success: false, error: 'Invalid request' })
    }

    const { email, otp } = parsed.data
    const normalizedEmail = email.toLowerCase().trim()
    const redis = getRedis()
    const key = `admin:otp:${normalizedEmail}`

    const stored = await redis.get(key)
    if (!stored) {
      return reply.code(400).send({
        success: false,
        error: 'OTP expired or not requested. Please start again.',
        code: 'OTP_EXPIRED',
      })
    }
    if (stored !== otp) {
      return reply.code(401).send({
        success: false,
        error: 'Incorrect OTP. Please check and try again.',
        code: 'INVALID_OTP',
      })
    }

    await redis.del(key) // single use

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (!user || !user.isAdmin) {
      return reply.code(403).send({ success: false, error: 'Admin access required' })
    }

    const token = signJWT(fastify, user)
    setAuthCookie(reply, token)

    return reply.send({
      success: true,
      data: { token, user: safeUser(user) },
    })
  })
}
