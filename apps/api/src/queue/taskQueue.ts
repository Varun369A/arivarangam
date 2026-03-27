import { Queue, QueueEvents } from 'bullmq';
import { getBullMQConnection } from '../redis';

// ─── Queue Names ──────────────────────────────────────────────────────────────

export const TASK_QUEUE_NAME = 'tasks';

// ─── Task Job Data ────────────────────────────────────────────────────────────

export interface TaskJobData {
  taskId: string;
  category: string;
  userId: string;
}

// ─── Queue Instance ───────────────────────────────────────────────────────────

let _queue: Queue<TaskJobData> | null = null;

export function getTaskQueue(): Queue<TaskJobData> {
  if (!_queue) {
    _queue = new Queue<TaskJobData>(TASK_QUEUE_NAME, {
      connection: getBullMQConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000, // 5s, 10s, 20s
        },
        removeOnComplete: { count: 100 },   // Keep last 100 completed
        removeOnFail: { count: 500 },        // Keep last 500 failed for debugging
        timeout: 30 * 60 * 1000,             // 30-minute job timeout
      },
    });

    _queue.on('error', (err) => {
      console.error('[TaskQueue] Queue error:', err.message);
    });
  }
  return _queue;
}

// ─── Queue Events (for monitoring) ───────────────────────────────────────────

let _queueEvents: QueueEvents | null = null;

export function getQueueEvents(): QueueEvents {
  if (!_queueEvents) {
    _queueEvents = new QueueEvents(TASK_QUEUE_NAME, {
      connection: getBullMQConnection(),
    });
  }
  return _queueEvents;
}

// ─── Helper — Add Task to Queue ───────────────────────────────────────────────

export async function enqueueTask(
  taskId: string,
  category: string,
  userId: string
): Promise<string> {
  const queue = getTaskQueue();
  const job = await queue.add(
    'process-task',
    { taskId, category, userId },
    {
      jobId: taskId, // Use taskId as jobId for idempotency (prevents duplicates)
    }
  );
  console.log(`[TaskQueue] Enqueued task ${taskId} (category: ${category}, jobId: ${job.id})`);
  return job.id!;
}

// ─── Helper — Get Queue Stats ─────────────────────────────────────────────────

export async function getQueueStats() {
  const queue = getTaskQueue();
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);
  return { waiting, active, completed, failed, delayed };
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

export async function closeTaskQueue(): Promise<void> {
  if (_queue) {
    await _queue.close();
    _queue = null;
  }
  if (_queueEvents) {
    await _queueEvents.close();
    _queueEvents = null;
  }
}
