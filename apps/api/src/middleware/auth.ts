import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@arivarangam/db';

// ─── CORS Headers Helper ──────────────────────────────────────────────────────
// Always set CORS headers so auth errors don't cause CORS failures on the client.

function setCorsHeaders(request: FastifyRequest, reply: FastifyReply): void {
  const origin = request.headers.origin;
  if (origin) {
    reply.header('Access-Control-Allow-Origin', origin);
  }
  reply.header('Access-Control-Allow-Credentials', 'true');
  reply.header('Vary', 'Origin');
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  setCorsHeaders(request, reply);

  try {
    // 1. Try Authorization header: "Bearer <token>"
    const authHeader = request.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }

    // 2. Try cookie
    if (!token) {
      token = (request.cookies as Record<string, string | undefined>)?.arivarangam_token;
    }

    // 3. Try query param ?token=
    if (!token) {
      const query = request.query as Record<string, string | undefined>;
      token = query.token;
    }

    if (!token) {
      return reply.code(401).send({ success: false, error: 'Authentication required', code: 'NO_TOKEN' });
    }

    // Verify JWT via Fastify's jwt plugin
    const payload = await (request.server as any).jwt.verify(token) as {
      sub: string;
      email: string;
      tier: string;
      isAdmin: boolean;
    };

    // Fetch fresh user from DB to check status
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, tier: true, isAdmin: true, status: true },
    });

    if (!user) {
      return reply.code(401).send({ success: false, error: 'User not found', code: 'USER_NOT_FOUND' });
    }

    if (user.status !== 'ACTIVE') {
      return reply.code(401).send({ success: false, error: 'Account is suspended or deleted', code: 'ACCOUNT_INACTIVE' });
    }

    // Attach user to request
    (request as any).user = {
      id: user.id,
      email: user.email,
      tier: user.tier,
      isAdmin: user.isAdmin,
    };
  } catch (err: any) {
    const message = err?.message?.includes('expired')
      ? 'Token expired'
      : 'Invalid token';
    return reply.code(401).send({ success: false, error: message, code: 'INVALID_TOKEN' });
  }
}

// ─── requireAdmin ────────────────────────────────────────────────────────────

export async function requireAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await requireAuth(request, reply);

  // If requireAuth already replied (error), stop here
  if (reply.sent) return;

  const user = (request as any).user;
  if (!user?.isAdmin) {
    setCorsHeaders(request, reply);
    return reply.code(403).send({ success: false, error: 'Admin access required', code: 'FORBIDDEN' });
  }
}
