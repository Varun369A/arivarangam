import { prisma } from '@arivarangam/db';
import { getRedis } from '../redis';
import { callClaudeHaiku } from '../connectors/claude';
import { pingOpenAI } from '../connectors/openai';
import { pingSarvam } from '../connectors/sarvam';
import { creditService } from '../services/CreditService';

// ─── Platform Monitor ─────────────────────────────────────────────────────────
// Runs every 5 minutes. Checks task health, API status, error rates.

export class PlatformMonitor {
  async run(): Promise<void> {
    console.log('[Monitor] Starting platform health check...');

    try {
      await Promise.all([
        this.checkStaleTasks(),
        this.checkRedis(),
        this.checkAPIConnectivity(),
        this.checkErrorRates(),
      ]);

      console.log('[Monitor] Health check complete');
    } catch (err: any) {
      console.error('[Monitor] Health check error:', err.message);

      await prisma.platformLog.create({
        data: {
          type: 'MONITOR',
          severity: 'ERROR',
          title: 'Platform Monitor Error',
          description: `Monitor failed with error: ${err.message}`,
        },
      }).catch(() => {});
    }
  }

  // ─── Check Stale Tasks ────────────────────────────────────────────────────────

  private async checkStaleTasks(): Promise<void> {
    const staleThreshold = new Date(Date.now() - 15 * 60 * 1000); // 15 minutes ago

    const staleTasks = await prisma.task.findMany({
      where: {
        status: { in: ['running', 'analyzing'] },
        startedAt: { lt: staleThreshold },
      },
      select: { id: true, userId: true, status: true, startedAt: true, prompt: true },
    });

    if (staleTasks.length > 0) {
      console.warn(`[Monitor] Found ${staleTasks.length} stale tasks`);
    }

    for (const task of staleTasks) {
      try {
        // Mark as failed
        await prisma.task.update({
          where: { id: task.id },
          data: {
            status: 'failed',
            errorMessage: 'Task timed out after 15 minutes and was automatically failed by the platform monitor.',
            completedAt: new Date(),
          },
        });

        // Refund credits
        await creditService.releaseReservation(task.userId, task.id);

        // Log event
        await prisma.taskEvent.create({
          data: {
            taskId: task.id,
            type: 'error',
            data: {
              message: 'Task timed out and was automatically failed',
              autoFailed: true,
            },
          },
        });

        // Log to platform
        await prisma.platformLog.create({
          data: {
            type: 'MONITOR',
            severity: 'WARNING',
            title: `Stale Task Auto-Failed: ${task.id}`,
            description: `Task ${task.id} was in ${task.status} state for > 15 minutes. Auto-failed and credits refunded. Prompt: ${task.prompt.slice(0, 200)}`,
          },
        });

        console.log(`[Monitor] Auto-failed stale task ${task.id}`);
      } catch (err: any) {
        console.error(`[Monitor] Failed to auto-fail task ${task.id}:`, err.message);
      }
    }
  }

  // ─── Check Redis ───────────────────────────────────────────────────────────────

  private async checkRedis(): Promise<void> {
    try {
      const redis = getRedis();
      const start = Date.now();
      await redis.ping();
      const latency = Date.now() - start;

      if (latency > 1000) {
        await prisma.platformLog.create({
          data: {
            type: 'MONITOR',
            severity: 'WARNING',
            title: 'Redis High Latency',
            description: `Redis ping took ${latency}ms (threshold: 1000ms)`,
          },
        });
      }
    } catch (err: any) {
      await prisma.platformLog.create({
        data: {
          type: 'MONITOR',
          severity: 'CRITICAL',
          title: 'Redis Connection Failed',
          description: `Redis connectivity check failed: ${err.message}`,
        },
      });
    }
  }

  // ─── Check API Connectivity ───────────────────────────────────────────────────

  private async checkAPIConnectivity(): Promise<void> {
    const checks = await Promise.allSettled([
      this.checkClaude(),
      pingOpenAI(),
      pingSarvam(),
    ]);

    const [claudeResult, openaiResult, elevenLabsResult] = checks;

    const services = [
      { name: 'Claude', result: claudeResult },
      { name: 'OpenAI', result: openaiResult },
      { name: 'ElevenLabs', result: elevenLabsResult },
    ];

    for (const service of services) {
      const { name, result } = service;
      const ok = result.status === 'fulfilled' && (result.value as any)?.ok !== false;

      if (!ok) {
        const err = result.status === 'rejected' ? result.reason?.message : 'Health check returned unhealthy';
        await prisma.platformLog.create({
          data: {
            type: 'MONITOR',
            severity: 'ERROR',
            title: `${name} API Unreachable`,
            description: `${name} connectivity check failed: ${err}`,
          },
        });
        console.error(`[Monitor] ${name} API is DOWN: ${err}`);
      }
    }
  }

  private async checkClaude(): Promise<{ ok: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      await callClaudeHaiku('Respond with "OK" only.', 'You are a ping service.', 10);
      return { ok: true, latencyMs: Date.now() - start };
    } catch {
      return { ok: false, latencyMs: Date.now() - start };
    }
  }

  // ─── Check Error Rates ────────────────────────────────────────────────────────

  private async checkErrorRates(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const [errorEvents, completedEvents] = await Promise.all([
      prisma.taskEvent.count({
        where: { type: 'error', createdAt: { gte: oneHourAgo } },
      }),
      prisma.taskEvent.count({
        where: { type: 'completed', createdAt: { gte: oneHourAgo } },
      }),
    ]);

    const total = errorEvents + completedEvents;
    if (total === 0) return;

    const errorRate = (errorEvents / total) * 100;

    if (errorRate > 10) {
      const severity = errorRate > 25 ? 'CRITICAL' : 'WARNING';
      await prisma.platformLog.create({
        data: {
          type: 'MONITOR',
          severity,
          title: `High Error Rate Detected: ${errorRate.toFixed(1)}%`,
          description:
            `In the last hour: ${errorEvents} errors out of ${total} tasks completed. ` +
            `Error rate: ${errorRate.toFixed(1)}% (threshold: 10%). Immediate investigation recommended.`,
        },
      });

      console.error(`[Monitor] HIGH ERROR RATE: ${errorRate.toFixed(1)}% (${errorEvents}/${total})`);
    } else {
      // Log healthy status periodically
      console.log(`[Monitor] Error rate: ${errorRate.toFixed(1)}% (${errorEvents}/${total} tasks in last hour)`);
    }
  }
}
