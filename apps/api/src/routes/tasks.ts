import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arrivarangam/db';
import { requireAuth } from '../middleware/auth';
import { taskService } from '../services/TaskService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  category: z.enum(['code', 'research', 'image', 'voice', 'content']),
  prompt: z.string().min(5, 'Prompt must be at least 5 characters').max(10000),
});

const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'analyzing', 'running', 'completed', 'failed', 'cancelled']).optional(),
  category: z.enum(['code', 'research', 'image', 'voice', 'content']).optional(),
});

const followUpSchema = z.object({
  prompt: z.string().min(1, 'Follow-up prompt is required').max(5000),
});

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function taskRoutes(fastify: FastifyInstance): Promise<void> {
  // All task routes require authentication
  fastify.addHook('preHandler', requireAuth);

  // POST / — create task
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const parseResult = createTaskSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { category, prompt } = parseResult.data;

    try {
      const { task, estimate } = await taskService.createTask(user.id, category, prompt);

      // Start task asynchronously
      taskService.startTask(task.id).catch(err => {
        console.error(`[Tasks] Failed to start task ${task.id}:`, err);
      });

      return reply.code(201).send({
        success: true,
        data: { task, estimate },
      });
    } catch (err: any) {
      if (err.message.includes('Insufficient credits')) {
        return reply.code(402).send({ success: false, error: err.message, code: 'INSUFFICIENT_CREDITS' });
      }
      throw err;
    }
  });

  // GET / — list tasks (paginated)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const queryParse = listTasksSchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { page, limit, status, category } = queryParse.data;
    const skip = (page - 1) * limit;

    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (category) where.category = category;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          category: true,
          status: true,
          prompt: true,
          creditsEstimatedMin: true,
          creditsEstimatedMax: true,
          creditsActuallyUsed: true,
          startedAt: true,
          completedAt: true,
          errorMessage: true,
          previewUrl: true,
          repoId: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { events: true } },
        },
      }),
      prisma.task.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: {
        tasks,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });

  // GET /:id — get task with events
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
      include: {
        events: { orderBy: { createdAt: 'asc' } },
        repo: { select: { id: true, name: true } },
      },
    });

    if (!task) {
      return reply.code(404).send({ success: false, error: 'Task not found' });
    }

    return reply.send({ success: true, data: { task } });
  });

  // DELETE /:id — cancel task
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    try {
      await taskService.cancelTask(id, user.id);
      return reply.send({ success: true, data: { message: 'Task cancelled successfully' } });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        return reply.code(404).send({ success: false, error: err.message });
      }
      if (err.message.includes('Not authorized')) {
        return reply.code(403).send({ success: false, error: err.message });
      }
      if (err.message.includes('Cannot cancel')) {
        return reply.code(400).send({ success: false, error: err.message });
      }
      throw err;
    }
  });

  // POST /:id/follow-up — add follow-up prompt
  fastify.post('/:id/follow-up', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const parseResult = followUpSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Follow-up prompt is required' });
    }

    const { prompt } = parseResult.data;

    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });

    if (!task) {
      return reply.code(404).send({ success: false, error: 'Task not found' });
    }

    if (task.status !== 'completed') {
      return reply.code(400).send({
        success: false,
        error: 'Can only add follow-ups to completed tasks',
        code: 'TASK_NOT_COMPLETED',
      });
    }

    // Create a new task based on the completed one
    const followUpPrompt = `[Follow-up on previous task]\nOriginal prompt: ${task.prompt}\n\nFollow-up request: ${prompt}`;

    try {
      const { task: newTask, estimate } = await taskService.createTask(user.id, task.category, followUpPrompt);

      // Carry over metadata context
      const followUpCount = ((task.metadata as any)?.followUpCount ?? 0) + 1;
      await prisma.task.update({
        where: { id: newTask.id },
        data: {
          metadata: {
            ...(newTask.metadata as any ?? {}),
            parentTaskId: task.id,
            followUpCount,
          },
        },
      });

      // Start task
      taskService.startTask(newTask.id).catch(err => {
        console.error(`[Tasks] Failed to start follow-up task ${newTask.id}:`, err);
      });

      return reply.code(201).send({
        success: true,
        data: { task: newTask, estimate, message: 'Follow-up task created' },
      });
    } catch (err: any) {
      if (err.message.includes('Insufficient credits')) {
        return reply.code(402).send({ success: false, error: err.message, code: 'INSUFFICIENT_CREDITS' });
      }
      throw err;
    }
  });

  // GET /:id/files — get generated files for task
  fastify.get('/:id/files', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
      select: { id: true, category: true, status: true, metadata: true },
    });

    if (!task) {
      return reply.code(404).send({ success: false, error: 'Task not found' });
    }

    if (task.status !== 'completed') {
      return reply.code(400).send({
        success: false,
        error: 'Files are only available for completed tasks',
        code: 'TASK_NOT_COMPLETED',
      });
    }

    const metadata = task.metadata as any;
    const files = metadata?.files ?? [];

    return reply.send({
      success: true,
      data: {
        files,
        taskId: task.id,
        category: task.category,
      },
    });
  });
}
