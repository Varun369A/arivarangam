import { prisma } from '@arivarangam/db';
import type { Task, TaskCategory, TaskEvent } from '@arivarangam/types';
import { creditService } from './CreditService';
import { getRedis, TASK_CHANNEL } from '../redis';
import { enqueueTask } from '../queue/taskQueue';

// ─── TaskService ──────────────────────────────────────────────────────────────

export class TaskService {
  // ─── Create Task ──────────────────────────────────────────────────────────────

  async createTask(
    userId: string,
    category: TaskCategory,
    prompt: string,
    context?: string
  ): Promise<{ task: any; estimate: any }> {
    // 1. Estimate credits
    const estimate = await creditService.estimateTask(prompt, category);

    // 2. Check user has enough credits (use max estimate)
    const balance = await creditService.getBalance(userId);
    if (balance < estimate.min) {
      throw new Error(
        `Insufficient credits. You have ${balance} credits but this task requires at least ${estimate.min}. ` +
        `Please purchase more credits.`
      );
    }

    // 3. Create task record
    const task = await prisma.task.create({
      data: {
        userId,
        category,
        prompt,
        status: 'pending',
        creditsEstimatedMin: estimate.min,
        creditsEstimatedMax: estimate.max,
        metadata: context ? { context } : undefined,
      },
    });

    // 4. Reserve credits (use typical estimate)
    await creditService.reserveCredits(userId, task.id, estimate.typical);

    return { task, estimate };
  }

  // ─── Start Task (enqueue to BullMQ) ──────────────────────────────────────────

  async startTask(taskId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.status !== 'pending') {
      throw new Error(`Task ${taskId} is not in pending state (status: ${task.status})`);
    }

    // Update status to analyzing — worker will move to 'running' when it picks up the job
    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'analyzing', startedAt: new Date() },
    });

    // Enqueue to BullMQ — worker pod picks this up and runs the engine
    // This is durable: if the API pod crashes, the job stays in Redis until a worker picks it
    await enqueueTask(taskId, task.category, task.userId);
  }

  private async dispatchToEngine(task: any): Promise<void> {
    const onEvent = async (event: TaskEvent) => {
      await this.emitEvent(task.id, event);
    };

    // Dynamic import to avoid circular deps and allow lazy loading
    switch (task.category) {
      case 'code': {
        const { CodeEngine } = await import('../engines/CodeEngine');
        await new CodeEngine().execute(task, onEvent);
        break;
      }
      case 'research': {
        const { ResearchEngine } = await import('../engines/ResearchEngine');
        await new ResearchEngine().execute(task, onEvent);
        break;
      }
      case 'image': {
        const { ImageEngine } = await import('../engines/ImageEngine');
        await new ImageEngine().execute(task, onEvent);
        break;
      }
      case 'voice': {
        const { VoiceEngine } = await import('../engines/VoiceEngine');
        await new VoiceEngine().execute(task, onEvent);
        break;
      }
      case 'content': {
        // Content reuses code engine with different prompting
        const { CodeEngine } = await import('../engines/CodeEngine');
        await new CodeEngine().execute(task, onEvent);
        break;
      }
      case 'mobile': {
        // Mobile (React Native/Expo) uses CodeEngine with mobile-specific system prompts
        const { CodeEngine } = await import('../engines/CodeEngine');
        await new CodeEngine().execute(task, onEvent);
        break;
      }
      case 'presentation': {
        // Reveal.js presentation uses CodeEngine with presentation-specific prompts
        const { CodeEngine } = await import('../engines/CodeEngine');
        await new CodeEngine().execute(task, onEvent);
        break;
      }
      case 'agent': {
        // AI Agent (Python/LangChain/CrewAI) uses CodeEngine with agent-specific prompts
        const { CodeEngine } = await import('../engines/CodeEngine');
        await new CodeEngine().execute(task, onEvent);
        break;
      }
      case 'workflow': {
        // n8n workflow uses CodeEngine with workflow-specific prompts
        const { CodeEngine } = await import('../engines/CodeEngine');
        await new CodeEngine().execute(task, onEvent);
        break;
      }
      default:
        throw new Error(`Unknown task category: ${task.category}`);
    }
  }

  // ─── Cancel Task ──────────────────────────────────────────────────────────────

  async cancelTask(taskId: string, userId: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });
    if (!task) throw new Error(`Task ${taskId} not found`);
    if (task.userId !== userId) throw new Error('Not authorized to cancel this task');

    const cancellable: string[] = ['pending', 'analyzing'];
    if (!cancellable.includes(task.status)) {
      throw new Error(`Cannot cancel task in status: ${task.status}`);
    }

    await prisma.task.update({
      where: { id: taskId },
      data: { status: 'cancelled' },
    });

    // Release credit reservation
    await creditService.releaseReservation(userId, taskId);

    await this.emitEvent(taskId, {
      type: 'log',
      data: { message: 'Task cancelled by user' },
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Get Task ─────────────────────────────────────────────────────────────────

  async getTask(taskId: string, userId: string): Promise<any> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!task) throw new Error(`Task ${taskId} not found`);
    return task;
  }

  // ─── List Tasks ───────────────────────────────────────────────────────────────

  async listTasks(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ tasks: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: { select: { events: true } },
        },
      }),
      prisma.task.count({ where: { userId } }),
    ]);

    return { tasks, total };
  }

  // ─── Emit Event ───────────────────────────────────────────────────────────────

  async emitEvent(taskId: string, event: TaskEvent): Promise<void> {
    // Save to DB
    await prisma.taskEvent.create({
      data: {
        taskId,
        type: event.type,
        data: event.data,
      },
    });

    // Publish to Redis for SSE subscribers
    try {
      const redis = getRedis();
      await redis.publish(TASK_CHANNEL(taskId), JSON.stringify(event));
    } catch (err) {
      console.error(`[TaskService] Redis publish error for task ${taskId}:`, err);
    }
  }

  // ─── Fail Task ────────────────────────────────────────────────────────────────

  async failTask(taskId: string, errorMessage: string): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true, status: true },
    });
    if (!task) return;
    if (task.status === 'completed' || task.status === 'cancelled') return;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'failed',
        errorMessage,
        completedAt: new Date(),
      },
    });

    // Release credit reservation
    await creditService.releaseReservation(task.userId, taskId);

    await this.emitEvent(taskId, {
      type: 'error',
      data: { message: errorMessage },
      timestamp: new Date().toISOString(),
    });
  }

  // ─── Complete Task ────────────────────────────────────────────────────────────

  async completeTask(
    taskId: string,
    actualCreditsUsed: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { userId: true },
    });
    if (!task) return;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'completed',
        creditsActuallyUsed: actualCreditsUsed,
        completedAt: new Date(),
        ...(metadata ? { metadata } : {}),
      },
    });

    await creditService.finalizeCredits(task.userId, taskId, actualCreditsUsed);
  }
}

export const taskService = new TaskService();
