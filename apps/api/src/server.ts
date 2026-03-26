import Fastify from 'fastify';
import FastifyCors from '@fastify/cors';
import FastifyHelmet from '@fastify/helmet';
import FastifyCookie from '@fastify/cookie';
import FastifyJWT from '@fastify/jwt';
import FastifyRateLimit from '@fastify/rate-limit';
import cron from 'node-cron';

import { getConfig } from '@arrivarangam/config';

import { authRoutes } from './routes/auth';
import { taskRoutes } from './routes/tasks';
import { repoRoutes } from './routes/repos';
import { creditRoutes } from './routes/credits';
import { streamRoutes } from './routes/stream';
import { webhookRoutes } from './routes/webhooks';
import { adminRoutes } from './routes/admin/index';

import { PlatformMonitor } from './platform/Monitor';
import { SelfImprove } from './platform/SelfImprove';
import { closeRedis } from './redis';
import { prisma } from '@arrivarangam/db';

// ─── Build Server ─────────────────────────────────────────────────────────────

async function buildServer() {
  const config = getConfig();

  const fastify = Fastify({
    logger: {
      level: config.NODE_ENV === 'production' ? 'warn' : 'info',
      transport: config.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
    trustProxy: true,
  });

  // ─── CORS ────────────────────────────────────────────────────────────────────

  await fastify.register(FastifyCors, {
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }
      if (config.CORS_ORIGINS.includes(origin) || config.CORS_ORIGINS.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy: origin ${origin} not allowed`), false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ─── Helmet ──────────────────────────────────────────────────────────────────

  await fastify.register(FastifyHelmet, {
    crossOriginEmbedderPolicy: false,  // No COEP
    crossOriginOpenerPolicy: false,     // No COOP
    contentSecurityPolicy: false,       // Disable CSP (API server)
  });

  // ─── Cookie ───────────────────────────────────────────────────────────────────

  await fastify.register(FastifyCookie, {
    secret: config.JWT_SECRET,
  });

  // ─── JWT ─────────────────────────────────────────────────────────────────────

  await fastify.register(FastifyJWT, {
    secret: config.JWT_SECRET,
    sign: {
      expiresIn: config.JWT_EXPIRES_IN,
    },
  });

  // ─── Rate Limit ───────────────────────────────────────────────────────────────

  await fastify.register(FastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: `Rate limit exceeded. Please wait ${Math.ceil(context.ttl / 1000)} seconds.`,
      code: 'RATE_LIMIT',
      retryAfter: context.ttl,
    }),
  });

  // ─── Routes ───────────────────────────────────────────────────────────────────

  await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
  await fastify.register(taskRoutes, { prefix: '/api/v1/tasks' });
  await fastify.register(repoRoutes, { prefix: '/api/v1/repos' });
  await fastify.register(creditRoutes, { prefix: '/api/v1/credits' });
  await fastify.register(streamRoutes, { prefix: '/api/v1/stream' });
  await fastify.register(adminRoutes, { prefix: '/api/v1/admin' });

  // Webhooks (no API v1 prefix — Razorpay calls /webhooks/razorpay)
  await fastify.register(webhookRoutes, { prefix: '/webhooks' });

  // ─── Health Check ─────────────────────────────────────────────────────────────

  fastify.get('/health', async (_request, reply) => {
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });

  fastify.get('/', async (_request, reply) => {
    return reply.send({
      name: 'Arrivarangam API',
      version: '1.0.0',
      status: 'running',
    });
  });

  // ─── Global Error Handler ─────────────────────────────────────────────────────

  fastify.setErrorHandler((error: any, request, reply) => {
    // Always add CORS headers to error responses
    const origin = request.headers.origin;
    if (origin) {
      reply.header('Access-Control-Allow-Origin', origin);
      reply.header('Access-Control-Allow-Credentials', 'true');
    }

    const statusCode = error.statusCode ?? 500;

    if (statusCode >= 500) {
      fastify.log.error({ err: error, req: { url: request.url, method: request.method } }, 'Internal error');
    }

    if (statusCode === 429) {
      return reply.code(429).send({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMIT',
      });
    }

    if (statusCode < 500) {
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }

    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  });

  // ─── 404 Handler ─────────────────────────────────────────────────────────────

  fastify.setNotFoundHandler((request, reply) => {
    const origin = request.headers.origin;
    if (origin) {
      reply.header('Access-Control-Allow-Origin', origin);
    }
    return reply.code(404).send({
      success: false,
      error: `Route ${request.method} ${request.url} not found`,
      code: 'NOT_FOUND',
    });
  });

  return fastify;
}

// ─── Start Cron Jobs ──────────────────────────────────────────────────────────

function startCronJobs(config: ReturnType<typeof getConfig>): void {
  if (config.ENABLE_PLATFORM_MONITOR) {
    // Every 5 minutes
    cron.schedule('*/5 * * * *', async () => {
      const monitor = new PlatformMonitor();
      await monitor.run().catch(err => {
        console.error('[Cron] Monitor error:', err);
      });
    });
    console.log('[Cron] Platform monitor scheduled (every 5 min)');
  }

  if (config.ENABLE_SELF_IMPROVE) {
    // Daily at 2am IST (UTC+5:30 = 20:30 UTC previous day)
    cron.schedule('30 20 * * *', async () => {
      const selfImprove = new SelfImprove();
      await selfImprove.run().catch(err => {
        console.error('[Cron] SelfImprove error:', err);
      });
    }, {
      timezone: 'Asia/Kolkata',
    });
    console.log('[Cron] Self-improve scheduled (daily 2am IST)');
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const config = getConfig();

  const server = await buildServer();

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\n[Server] Received ${signal}, shutting down gracefully...`);

    try {
      await server.close();
      await closeRedis();
      await prisma.$disconnect();
      console.log('[Server] Shutdown complete');
      process.exit(0);
    } catch (err) {
      console.error('[Server] Shutdown error:', err);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  try {
    await server.listen({ port: config.PORT, host: '0.0.0.0' });

    console.log(`
╔══════════════════════════════════════════╗
║       Arrivarangam API Server            ║
║  Running on port ${config.PORT}                  ║
║  Environment: ${config.NODE_ENV.padEnd(20)}     ║
╚══════════════════════════════════════════╝
    `.trim());

    // Start cron jobs after server is listening
    startCronJobs(config);
  } catch (err) {
    console.error('[Server] Failed to start:', err);
    process.exit(1);
  }
}

main();
