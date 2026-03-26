import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '@arrivarangam/db';
import { getConfig } from '@arrivarangam/config';
import { TASK_CHANNEL, createSubscriber } from '../redis';

// ─── SSE Stream Routes ────────────────────────────────────────────────────────

export async function streamRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /tasks/:taskId — SSE stream for task events
  fastify.get('/tasks/:taskId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { taskId } = request.params as { taskId: string };
    const config = getConfig();

    // ─── CORS headers — always set, regardless of auth status ─────────────────
    const origin = request.headers.origin;
    if (origin) {
      reply.raw.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    }
    reply.raw.setHeader('Access-Control-Allow-Credentials', 'true');
    reply.raw.setHeader('Vary', 'Origin');

    // ─── Auth — extract token from query param, header, or cookie ────────────
    let userId: string | null = null;

    try {
      const query = request.query as Record<string, string | undefined>;
      const authHeader = request.headers.authorization;
      const cookieToken = (request.cookies as Record<string, string | undefined>)?.arrivarangam_token;

      const token = query.token ?? (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined) ?? cookieToken;

      if (!token) {
        reply.raw.writeHead(401, { 'Content-Type': 'application/json' });
        reply.raw.end(JSON.stringify({ success: false, error: 'Authentication required', code: 'NO_TOKEN' }));
        return;
      }

      const payload = await (request.server as any).jwt.verify(token) as { sub: string };
      userId = payload.sub;
    } catch (err) {
      reply.raw.writeHead(401, { 'Content-Type': 'application/json' });
      reply.raw.end(JSON.stringify({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' }));
      return;
    }

    // ─── Verify task ownership ─────────────────────────────────────────────────
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId: userId! },
      select: { id: true, status: true },
    });

    if (!task) {
      reply.raw.writeHead(404, { 'Content-Type': 'application/json' });
      reply.raw.end(JSON.stringify({ success: false, error: 'Task not found' }));
      return;
    }

    // ─── SSE Setup ─────────────────────────────────────────────────────────────
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    });

    // Send initial connection event
    reply.raw.write(`event: connected\ndata: ${JSON.stringify({ taskId, status: task.status })}\n\n`);

    // If task is already completed/failed/cancelled, send final state and close
    if (['completed', 'failed', 'cancelled'].includes(task.status)) {
      // Send existing events
      const events = await prisma.taskEvent.findMany({
        where: { taskId },
        orderBy: { createdAt: 'asc' },
        take: 100,
      });

      for (const event of events) {
        reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify({ ...event.data, timestamp: event.createdAt.toISOString() })}\n\n`);
      }

      reply.raw.write(`event: stream_end\ndata: ${JSON.stringify({ reason: 'task_complete' })}\n\n`);
      reply.raw.end();
      return;
    }

    // ─── Redis Subscribe ───────────────────────────────────────────────────────
    const subscriber = createSubscriber();
    const channel = TASK_CHANNEL(taskId);

    let heartbeatTimer: NodeJS.Timeout | null = null;
    let isEnded = false;

    const cleanup = () => {
      if (isEnded) return;
      isEnded = true;
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      subscriber.unsubscribe(channel).catch(() => {});
      subscriber.quit().catch(() => {});
    };

    // Send heartbeat every 30 seconds
    heartbeatTimer = setInterval(() => {
      if (isEnded) return;
      try {
        reply.raw.write(`: heartbeat\n\n`);
      } catch {
        cleanup();
      }
    }, 30000);

    // Handle client disconnect
    request.raw.on('close', cleanup);
    request.raw.on('error', cleanup);

    subscriber.subscribe(channel, (err) => {
      if (err) {
        console.error(`[SSE] Redis subscribe error for task ${taskId}:`, err);
        cleanup();
        try {
          reply.raw.write(`event: error\ndata: ${JSON.stringify({ message: 'Stream subscription failed' })}\n\n`);
          reply.raw.end();
        } catch {}
        return;
      }
    });

    subscriber.on('message', (chan: string, message: string) => {
      if (isEnded) return;
      if (chan !== channel) return;

      try {
        const event = JSON.parse(message);

        reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data ?? event)}\nid: ${Date.now()}\n\n`);

        // Close stream on terminal events
        if (event.type === 'completed' || event.type === 'error') {
          setTimeout(() => {
            if (!isEnded) {
              reply.raw.write(`event: stream_end\ndata: ${JSON.stringify({ reason: event.type })}\n\n`);
              reply.raw.end();
              cleanup();
            }
          }, 500);
        }
      } catch (err) {
        console.error('[SSE] Error processing message:', err);
      }
    });

    subscriber.on('error', (err: Error) => {
      console.error(`[SSE] Redis subscriber error for task ${taskId}:`, err);
    });

    // Return the raw response to Fastify (don't send via reply)
    return reply;
  });
}
