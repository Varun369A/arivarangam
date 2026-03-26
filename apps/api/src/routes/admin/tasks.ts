import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arrivarangam/db';
import { creditService } from '../../services/CreditService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'analyzing', 'running', 'completed', 'failed', 'cancelled']).optional(),
  category: z.enum(['code', 'research', 'image', 'voice', 'content']).optional(),
  userId: z.string().optional(),
});

// ─── Admin Tasks Routes ───────────────────────────────────────────────────────

export async function adminTasksRoutes(fastify: FastifyInstance): Promise<void> {

  // GET / — all tasks with filters
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParse = listTasksSchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { page, limit, status, category, userId } = queryParse.data;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (category) where.category = category;
    if (userId) where.userId = userId;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
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

  // GET /:id — task detail with all events and logs
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, name: true, tier: true } },
        events: { orderBy: { createdAt: 'asc' } },
        repo: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return reply.code(404).send({ success: false, error: 'Task not found' });
    }

    return reply.send({ success: true, data: { task } });
  });

  // DELETE /:id — force kill running task + refund credits
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true, prompt: true },
    });

    if (!task) {
      return reply.code(404).send({ success: false, error: 'Task not found' });
    }

    const prevStatus = task.status;

    // Force-fail the task
    await prisma.task.update({
      where: { id },
      data: {
        status: 'failed',
        errorMessage: 'Task force-killed by admin',
        completedAt: new Date(),
      },
    });

    // Refund credits if was in progress
    if (['pending', 'analyzing', 'running'].includes(prevStatus)) {
      await creditService.releaseReservation(task.userId, task.id);
    }

    // Create task event
    await prisma.taskEvent.create({
      data: {
        taskId: id,
        type: 'error',
        data: {
          message: 'Task force-killed by admin',
          adminId: (request as any).user?.id,
        },
      },
    });

    return reply.send({
      success: true,
      data: {
        message: 'Task killed and credits refunded',
        previousStatus: prevStatus,
      },
    });
  });
}
