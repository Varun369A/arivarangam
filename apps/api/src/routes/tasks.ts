import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arivarangam/db';
import { requireAuth } from '../middleware/auth';
import { sanitizePrompt, TASK_CREATE_RATE_LIMIT } from '../middleware/security';
import { taskService } from '../services/TaskService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createTaskSchema = z.object({
  category: z.enum(['code', 'research', 'image', 'voice', 'content', 'mobile', 'presentation', 'agent', 'workflow']),
  prompt: z.string().min(5, 'Prompt must be at least 5 characters').max(10000),
  context: z.string().max(2000).optional(),
});

const listTasksSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'analyzing', 'running', 'completed', 'failed', 'cancelled']).optional(),
  category: z.enum(['code', 'research', 'image', 'voice', 'content', 'mobile', 'presentation', 'agent', 'workflow']).optional(),
});

const followUpSchema = z.object({
  prompt: z.string().min(1, 'Follow-up prompt is required').max(5000),
});

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function taskRoutes(fastify: FastifyInstance): Promise<void> {
  // All task routes require authentication
  fastify.addHook('preHandler', requireAuth);

  // POST / — create task
  fastify.post('/', { config: { rateLimit: TASK_CREATE_RATE_LIMIT } }, async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const parseResult = createTaskSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { category, context } = parseResult.data;
    // Sanitize prompt to prevent injection attacks against the AI agent
    const { sanitized: prompt, wasModified } = sanitizePrompt(parseResult.data.prompt);
    if (wasModified) {
      console.warn(`[Security] Prompt injection attempt detected from user ${user.id}`);
    }

    try {
      // Enforce 1 active task per user — prevents rate limit cascade and resource exhaustion
      const activeTask = await prisma.task.findFirst({
        where: { userId: user.id, status: { in: ['pending', 'analyzing', 'running'] } },
        select: { id: true, status: true },
      });
      if (activeTask) {
        return reply.code(429).send({
          success: false,
          error: 'You already have a task in progress. Please wait for it to complete before starting a new one.',
          code: 'TASK_ALREADY_RUNNING',
          data: { activeTaskId: activeTask.id },
        });
      }

      const { task, estimate } = await taskService.createTask(user.id, category, prompt, context);

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
          deployUrl: true,
          isPublic: true,
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

  // POST /:id/follow-up — refine project in place (same task, no new task created)
  fastify.post('/:id/follow-up', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const parseResult = followUpSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Follow-up prompt is required' });
    }

    const { sanitized: prompt } = sanitizePrompt(parseResult.data.prompt);

    const task = await prisma.task.findFirst({
      where: { id, userId: user.id },
    });

    if (!task) {
      return reply.code(404).send({ success: false, error: 'Task not found' });
    }

    if (task.status !== 'completed') {
      return reply.code(400).send({
        success: false,
        error: 'Can only refine completed tasks',
        code: 'TASK_NOT_COMPLETED',
      });
    }

    // Check user has at least 10 credits for refinement
    const { creditService } = await import('../services/CreditService');
    const balance = await creditService.getBalance(user.id);
    if (balance < 10) {
      return reply.code(402).send({
        success: false,
        error: 'Insufficient credits for refinement. You need at least 10 credits.',
        code: 'INSUFFICIENT_CREDITS',
      });
    }

    // Get previous files from metadata
    const previousFiles: { path: string; content: string }[] = (task.metadata as any)?.files ?? [];

    // Add user_message event
    await taskService.emitEvent(id, {
      type: 'user_message' as any,
      data: { message: prompt },
      timestamp: new Date().toISOString(),
    });

    // Run refinement asynchronously (same pattern as startTask)
    const { CodeEngine } = await import('../engines/CodeEngine');
    new CodeEngine().refine(task, prompt, previousFiles, async (event) => {
      await taskService.emitEvent(id, event);
    }).catch(async (err) => {
      console.error(`[Tasks] Refinement failed for task ${id}:`, err);
      await taskService.failTask(id, err.message ?? 'Refinement failed');
    });

    // Return the same task immediately
    const updatedTask = await prisma.task.findFirst({ where: { id } });
    return reply.send({
      success: true,
      data: { task: updatedTask, message: 'Refinement started' },
    });
  });

  // DELETE /:id/permanent — hard delete task and all its events
  fastify.delete('/:id/permanent', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { id } = request.params as { id: string };

    const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!task) {
      return reply.code(404).send({ success: false, error: 'Task not found' });
    }

    // Release any pending credit reservation before deleting
    try {
      const { creditService } = await import('../services/CreditService');
      await creditService.releaseReservation(user.id, id);
    } catch {
      // ignore — no reservation may exist
    }

    await prisma.task.delete({ where: { id } });

    return reply.send({ success: true, data: { message: 'Task deleted' } });
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
