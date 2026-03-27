import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arivarangam/db';
import { requireAuth } from '../middleware/auth';

// ─── Public Gallery — no auth required ────────────────────────────────────────

export async function galleryRoutes(fastify: FastifyInstance): Promise<void> {
  const listSchema = z.object({
    page:     z.coerce.number().int().min(1).default(1),
    limit:    z.coerce.number().int().min(1).max(50).default(20),
    category: z.enum(['code', 'research', 'image', 'voice', 'content', 'mobile', 'presentation', 'agent', 'workflow']).optional(),
  });

  // GET / — list public completed tasks
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const parse = listSchema.safeParse(request.query);
    if (!parse.success) return reply.code(400).send({ success: false, error: 'Invalid query' });
    const { page, limit, category } = parse.data;
    const skip = (page - 1) * limit;

    const where: any = { status: 'completed', isPublic: true };
    if (category) where.category = category;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { completedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          category: true,
          prompt: true,
          previewUrl: true,
          deployUrl: true,
          creditsActuallyUsed: true,
          completedAt: true,
          createdAt: true,
          user: { select: { name: true } },
          _count: { select: { events: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: { tasks, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // POST /:id/publish — make a task public (requires auth)
  fastify.post('/:id/publish', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });
    if (task.status !== 'completed') return reply.code(400).send({ success: false, error: 'Only completed tasks can be published' });

    await prisma.task.update({ where: { id }, data: { isPublic: true } });
    return reply.send({ success: true, data: { message: 'Task published to gallery' } });
  });

  // POST /:id/unpublish — remove from gallery (requires auth)
  fastify.post('/:id/unpublish', { preHandler: requireAuth }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!task) return reply.code(404).send({ success: false, error: 'Task not found' });

    await prisma.task.update({ where: { id }, data: { isPublic: false } });
    return reply.send({ success: true, data: { message: 'Task removed from gallery' } });
  });
}
