/**
 * BullMQ Task Worker — standalone entry point
 *
 * Deploy as a separate process/container alongside the API server:
 *   API:    node dist/server.js   (handles HTTP requests)
 *   Worker: node dist/worker.js  (processes task queue jobs)
 *
 * Both share the same codebase — different Railway services, same Docker image.
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { Worker, Job } from 'bullmq';
import { getConfig } from '@arivarangam/config';
import { prisma } from '@arivarangam/db';
import Redis from 'ioredis';
import { creditService } from './services/CreditService';
import { TASK_CHANNEL, getBullMQConnection } from './redis';
import type { TaskEvent } from '@arivarangam/types';

// ─── Publisher (for SSE relay — not BullMQ mode) ──────────────────────────────

let _publisher: Redis | null = null;

function getPublisher(): Redis {
  if (!_publisher) {
    const config = getConfig();
    _publisher = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
    });
    _publisher.on('error', (err) => console.error('[Worker:Redis] Publish error:', err.message));
  }
  return _publisher;
}

// ─── Event Emitter ────────────────────────────────────────────────────────────

async function emitEvent(taskId: string, event: TaskEvent): Promise<void> {
  try {
    await prisma.taskEvent.create({
      data: { taskId, type: event.type, data: event.data as any },
    });
    await getPublisher().publish(TASK_CHANNEL(taskId), JSON.stringify(event));
  } catch (err) {
    console.error(`[Worker] emitEvent failed for task ${taskId}:`, err);
  }
}

// ─── Engine Dispatcher ────────────────────────────────────────────────────────

async function dispatchToEngine(task: any): Promise<void> {
  const onEvent = async (event: TaskEvent) => emitEvent(task.id, event);

  switch (task.category) {
    // ── Web: Three.js + GSAP + Lenis + tsParticles + Vanta + Lottie + Swiper ─
    case 'code': {
      const { WebEngine } = await import('./engines/WebEngine');
      await new WebEngine().execute(task, onEvent);
      break;
    }
    // ── Mobile: Expo + Reanimated + Moti + Lottie + LinearGradient ───────────
    case 'mobile': {
      const { MobileEngine } = await import('./engines/MobileEngine');
      await new MobileEngine().execute(task, onEvent);
      break;
    }
    // ── Animation: Three.js / GSAP / Canvas / tsParticles / Vanta ────────────
    case 'animation': {
      const { AnimationEngine } = await import('./engines/AnimationEngine');
      await new AnimationEngine().execute(task, onEvent);
      break;
    }
    // ── Presentation: Reveal.js with custom themes and animations ─────────────
    case 'presentation': {
      const { PresentationEngine } = await import('./engines/PresentationEngine');
      await new PresentationEngine().execute(task, onEvent);
      break;
    }
    // ── Content: Long-form articles, marketing copy, SEO content ─────────────
    case 'content': {
      const { ContentEngine } = await import('./engines/ContentEngine');
      await new ContentEngine().execute(task, onEvent);
      break;
    }
    // ── Agent: Python LangChain / CrewAI / LlamaIndex agents ─────────────────
    case 'agent': {
      const { AgentEngine } = await import('./engines/AgentEngine');
      await new AgentEngine().execute(task, onEvent);
      break;
    }
    // ── Workflow: n8n / Make / GitHub Actions / Shell automation ─────────────
    case 'workflow': {
      const { WorkflowEngine } = await import('./engines/WorkflowEngine');
      await new WorkflowEngine().execute(task, onEvent);
      break;
    }
    // ── Research: Perplexity web search + Claude synthesis ────────────────────
    case 'research': {
      const { ResearchEngine } = await import('./engines/ResearchEngine');
      await new ResearchEngine().execute(task, onEvent);
      break;
    }
    // ── Image: DALL-E 3 HD with prompt enhancement ────────────────────────────
    case 'image': {
      const { ImageEngine } = await import('./engines/ImageEngine');
      await new ImageEngine().execute(task, onEvent);
      break;
    }
    // ── Voice: Sarvam AI TTS with multilingual support ────────────────────────
    case 'voice': {
      const { VoiceEngine } = await import('./engines/VoiceEngine');
      await new VoiceEngine().execute(task, onEvent);
      break;
    }
    default:
      throw new Error(`Unknown task category: ${task.category}`);
  }
}

// ─── Task Failure Helper ──────────────────────────────────────────────────────

async function failTask(taskId: string, userId: string, errorMessage: string): Promise<void> {
  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    select: { status: true },
  });
  if (!existing || ['completed', 'cancelled', 'failed'].includes(existing.status)) return;

  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'failed', errorMessage, completedAt: new Date() },
  });

  await creditService.releaseReservation(userId, taskId);

  await emitEvent(taskId, {
    type: 'error',
    data: { message: errorMessage },
    timestamp: new Date().toISOString(),
  });
}

// ─── Job Processor ────────────────────────────────────────────────────────────

interface TaskJobData {
  taskId: string;
  category: string;
  userId: string;
}

async function processTaskJob(job: Job<TaskJobData>): Promise<void> {
  const { taskId, userId } = job.data;
  console.log(`[Worker] Job ${job.id} — task ${taskId} (attempt ${job.attemptsMade + 1})`);

  // Load task
  const task = await prisma.task.findUnique({ where: { id: taskId } });
  if (!task) {
    console.error(`[Worker] Task ${taskId} not found — skipping`);
    return;
  }

  // Idempotency: skip if already in terminal state
  if (['completed', 'cancelled', 'failed'].includes(task.status)) {
    console.log(`[Worker] Task ${taskId} already ${task.status} — skipping`);
    return;
  }

  // Mark as running
  await prisma.task.update({
    where: { id: taskId },
    data: { status: 'running' },
  });

  await emitEvent(taskId, {
    type: 'log',
    data: { message: 'Task picked up by worker — starting execution' },
    timestamp: new Date().toISOString(),
  });

  await job.updateProgress(5);

  try {
    await dispatchToEngine(task);
    await job.updateProgress(100);

    // Finalize if engine didn't already complete the task
    const updatedTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { status: true, creditsActuallyUsed: true },
    });

    if (updatedTask && updatedTask.status !== 'completed') {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'completed',
          creditsActuallyUsed: updatedTask.creditsActuallyUsed ?? task.creditsEstimatedMin ?? 10,
          completedAt: new Date(),
        },
      });
      await creditService.finalizeCredits(
        userId,
        taskId,
        updatedTask.creditsActuallyUsed ?? task.creditsEstimatedMin ?? 10
      );
    }

    console.log(`[Worker] Task ${taskId} — done`);
  } catch (err: any) {
    const msg = err?.message ?? 'Worker execution error';
    console.error(`[Worker] Task ${taskId} failed:`, msg);
    await failTask(taskId, userId, msg);
    throw err; // Re-throw → BullMQ retries the job
  }
}

// ─── Start Worker ─────────────────────────────────────────────────────────────

async function startWorker(): Promise<void> {
  const config = getConfig();
  const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '3', 10);

  const worker = new Worker<TaskJobData>('tasks', processTaskJob, {
    connection: getBullMQConnection(),
    concurrency: CONCURRENCY,
    lockDuration: 5 * 60 * 1000,   // 5-minute lock
    lockRenewTime: 2 * 60 * 1000,  // Renew every 2 minutes (for long Claude tasks)
  });

  worker.on('completed', (job) => console.log(`[Worker] ✓ Job ${job.id} done`));
  worker.on('failed', (job, err) =>
    console.error(`[Worker] ✗ Job ${job?.id} failed (${job?.attemptsMade}/${job?.opts.attempts}):`, err.message)
  );
  worker.on('stalled', (jobId) => console.warn(`[Worker] ⚠ Job ${jobId} stalled — will retry`));
  worker.on('error', (err) => console.error('[Worker] Worker error:', err.message));

  const shutdown = async (signal: string) => {
    console.log(`\n[Worker] ${signal} — draining queue...`);
    await worker.close();
    await prisma.$disconnect();
    if (_publisher) await _publisher.quit();
    console.log('[Worker] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  console.log(`
╔══════════════════════════════════════════╗
║       Arrivarangam Task Worker           ║
║  Concurrency: ${String(CONCURRENCY).padEnd(27)}║
║  Environment: ${config.NODE_ENV.padEnd(27)}║
╚══════════════════════════════════════════╝
  `.trim());
  console.log('[Worker] Ready — waiting for jobs...');
}

startWorker().catch((err) => {
  console.error('[Worker] Fatal startup error:', err);
  process.exit(1);
});
