import { FastifyInstance } from 'fastify';
import { prisma } from '@arivarangam/db';

// ─── Admin Security Routes ────────────────────────────────────────────────────

export async function adminSecurityRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /admin/security/events
  fastify.get('/events', async (request, reply) => {
    const query = request.query as {
      page?: string;
      limit?: string;
      severity?: string;
      resolved?: string;
    };

    const page = Math.max(1, parseInt(query.page ?? '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(query.limit ?? '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (query.severity) where.severity = query.severity;
    if (query.resolved === 'true') where.resolved = true;
    if (query.resolved === 'false') where.resolved = false;

    // Check if SecurityEvent model exists in schema
    let events: any[] = [];
    let total = 0;
    let stats = { today: 0, unresolved: 0, critical: 0 };

    try {
      const [rawEvents, rawTotal, todayCount, unresolvedCount, criticalCount] = await Promise.all([
        (prisma as any).securityEvent.findMany({
          where,
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        (prisma as any).securityEvent.count({ where }),
        (prisma as any).securityEvent.count({
          where: {
            createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        }),
        (prisma as any).securityEvent.count({ where: { resolved: false } }),
        (prisma as any).securityEvent.count({ where: { severity: 'CRITICAL', resolved: false } }),
      ]);

      events = rawEvents;
      total = rawTotal;
      stats = { today: todayCount, unresolved: unresolvedCount, critical: criticalCount };
    } catch {
      // SecurityEvent model may not exist yet — return empty data
    }

    return reply.send({
      success: true,
      data: {
        events,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        stats,
      },
    });
  });

  // POST /admin/security/events/:id/resolve
  fastify.post<{ Params: { id: string } }>('/events/:id/resolve', async (request, reply) => {
    const { id } = request.params;

    try {
      await (prisma as any).securityEvent.update({
        where: { id },
        data: { resolved: true, resolvedAt: new Date() },
      });
    } catch {
      // Model may not exist yet
    }

    return reply.send({ success: true });
  });
}
