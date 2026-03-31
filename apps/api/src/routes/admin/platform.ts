import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arivarangam/db';
import { getRedis } from '../../redis';
import { callClaudeHaiku } from '../../connectors/claude';
import { pingOpenAI } from '../../connectors/openai';
import { pingSarvam } from '../../connectors/sarvam';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const listLogsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['ERROR', 'FIX_APPLIED', 'IMPROVEMENT', 'SECURITY', 'MODEL_ADDED', 'MONITOR']).optional(),
  severity: z.enum(['INFO', 'WARNING', 'ERROR', 'CRITICAL']).optional(),
  approved: z.enum(['true', 'false']).optional(),
});

const performanceQuerySchema = z.object({
  model: z.string().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Admin Platform Routes ────────────────────────────────────────────────────

export async function adminPlatformRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /stats — top-level platform overview numbers
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart  = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersToday,
      totalTasks,
      tasksToday,
      tasksRunning,
      tasksFailed,
      creditsResult,
      revenueResult,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.task.count(),
      prisma.task.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.task.count({ where: { status: { in: ['running', 'analyzing', 'pending'] } } }),
      prisma.task.count({ where: { status: 'failed', createdAt: { gte: weekStart } } }),
      prisma.task.aggregate({ _sum: { creditsActuallyUsed: true } }),
      prisma.creditTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'PURCHASE', status: 'COMPLETED' },
      }),
    ]);

    return reply.send({
      success: true,
      data: {
        totalUsers,
        newUsersToday,
        totalTasks,
        tasksToday,
        tasksRunning,
        tasksFailed7d: tasksFailed,
        totalCreditsUsed: creditsResult._sum.creditsActuallyUsed ?? 0,
        totalRevenue: Math.abs(revenueResult._sum.amount ?? 0),
      },
    });
  });

  // GET /logs — platform self-improvement logs
  fastify.get('/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParse = listLogsSchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { page, limit, type, severity, approved } = queryParse.data;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (severity) where.severity = severity;
    if (approved !== undefined) where.approved = approved === 'true';

    const [logs, total] = await Promise.all([
      prisma.platformLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.platformLog.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: { logs, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /health — model API status, error rates, active tasks count
  fastify.get('/health', async (request: FastifyRequest, reply: FastifyReply) => {
    const [activeTasks, recentErrors, redisOk, claudeOk, openaiResult, sarvamResult] = await Promise.allSettled([
      prisma.task.count({ where: { status: { in: ['running', 'analyzing'] } } }),
      prisma.taskEvent.count({
        where: {
          type: 'error',
          createdAt: { gte: new Date(Date.now() - 3600 * 1000) }, // last hour
        },
      }),
      // Redis ping
      getRedis().ping().then(() => true).catch(() => false),
      // Claude ping (lightweight)
      callClaudeHaiku('ping', 'Reply with OK only', 10).then(() => ({ ok: true, latencyMs: 0 })).catch(() => ({ ok: false, latencyMs: 0 })),
      // OpenAI ping
      pingOpenAI(),
      // Sarvam AI ping
      pingSarvam(),
    ]);

    const activeTaskCount = activeTasks.status === 'fulfilled' ? activeTasks.value : 0;
    const errorCount = recentErrors.status === 'fulfilled' ? recentErrors.value : 0;
    const totalTasksLastHour = await prisma.taskEvent.count({
      where: {
        type: 'completed',
        createdAt: { gte: new Date(Date.now() - 3600 * 1000) },
      },
    }).catch(() => 0);

    const errorRate = totalTasksLastHour > 0
      ? (errorCount / (errorCount + totalTasksLastHour)) * 100
      : 0;

    const claudeStatus = claudeOk.status === 'fulfilled' && (claudeOk.value as any)?.ok !== false
      ? 'ok' : 'error';

    const openaiStatus = openaiResult.status === 'fulfilled' && (openaiResult.value as any)?.ok
      ? 'ok' : 'error';

    const sarvamStatus = sarvamResult.status === 'fulfilled' && (sarvamResult.value as any)?.ok
      ? 'ok' : 'error';

    const redisStatus = redisOk.status === 'fulfilled' && redisOk.value ? 'ok' : 'error';

    const overallStatus =
      claudeStatus === 'error' || openaiStatus === 'error' || redisStatus === 'error'
        ? 'degraded'
        : errorRate > 25 ? 'degraded' : 'healthy';

    return reply.send({
      success: true,
      data: {
        status: overallStatus,
        models: {
          claude: { status: claudeStatus },
          openai: {
            status: openaiStatus,
            latencyMs: openaiResult.status === 'fulfilled' ? (openaiResult.value as any)?.latencyMs : null,
          },
          perplexity: { status: 'unknown' }, // Perplexity has no cheap ping
          sarvam: {
            status: sarvamStatus,
            latencyMs: sarvamResult.status === 'fulfilled' ? (sarvamResult.value as any)?.latencyMs : null,
          },
        },
        redis: { status: redisStatus },
        database: { status: 'ok' }, // If we got here, DB is fine
        activeTasks: activeTaskCount,
        errorRateLast1h: Math.round(errorRate * 100) / 100,
      },
    });
  });

  // POST /logs/:id/approve — approve a pending self-fix
  fastify.post('/logs/:id/approve', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const log = await prisma.platformLog.findUnique({ where: { id } });
    if (!log) {
      return reply.code(404).send({ success: false, error: 'Log not found' });
    }

    if (log.approved) {
      return reply.code(400).send({ success: false, error: 'Log already approved' });
    }

    const updated = await prisma.platformLog.update({
      where: { id },
      data: { approved: true, approvedAt: new Date() },
    });

    return reply.send({
      success: true,
      data: { log: updated, message: 'Log approved' },
    });
  });

  // GET /performance — model performance stats
  fastify.get('/performance', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParse = performanceQuerySchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { model, category, limit } = queryParse.data;

    const where: any = {};
    if (model) where.model = model;
    if (category) where.taskCategory = category;

    const performances = await prisma.modelPerformance.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Aggregate by model
    const byModel: Record<string, { avgSuccessRate: number; avgLatency: number; totalSamples: number }> = {};
    for (const p of performances) {
      if (!byModel[p.model]) {
        byModel[p.model] = { avgSuccessRate: 0, avgLatency: 0, totalSamples: 0 };
      }
      const entry = byModel[p.model];
      const total = entry.totalSamples + p.sampleSize;
      entry.avgSuccessRate = (entry.avgSuccessRate * entry.totalSamples + p.successRate * p.sampleSize) / total;
      entry.avgLatency = (entry.avgLatency * entry.totalSamples + p.avgLatencyMs * p.sampleSize) / total;
      entry.totalSamples = total;
    }

    return reply.send({
      success: true,
      data: { performances, summary: byModel },
    });
  });
}
