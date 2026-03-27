import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getTaskQueue, getQueueStats } from '../../queue/taskQueue';

// ─── Admin Queue Routes ───────────────────────────────────────────────────────

export async function adminQueueRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /stats — queue health and counts
  fastify.get('/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    const stats = await getQueueStats();
    return reply.send({ success: true, data: { queue: 'tasks', ...stats } });
  });

  // GET /jobs — list recent jobs (active + waiting)
  fastify.get('/jobs', async (request: FastifyRequest, reply: FastifyReply) => {
    const { state = 'active' } = request.query as { state?: string };
    const queue = getTaskQueue();

    let jobs: any[] = [];
    switch (state) {
      case 'active':    jobs = await queue.getActive(0, 50); break;
      case 'waiting':   jobs = await queue.getWaiting(0, 50); break;
      case 'failed':    jobs = await queue.getFailed(0, 50); break;
      case 'completed': jobs = await queue.getCompleted(0, 50); break;
      case 'delayed':   jobs = await queue.getDelayed(0, 50); break;
      default:          return reply.code(400).send({ success: false, error: 'Invalid state' });
    }

    const mapped = jobs.map(j => ({
      id: j.id,
      name: j.name,
      data: j.data,
      progress: j.progress,
      attemptsMade: j.attemptsMade,
      processedOn: j.processedOn,
      finishedOn: j.finishedOn,
      failedReason: j.failedReason,
      timestamp: j.timestamp,
    }));

    return reply.send({ success: true, data: { jobs: mapped, state, count: mapped.length } });
  });

  // POST /jobs/:id/retry — retry a failed job
  fastify.post('/jobs/:id/retry', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const queue = getTaskQueue();

    const job = await queue.getJob(id);
    if (!job) return reply.code(404).send({ success: false, error: 'Job not found' });

    await job.retry();
    return reply.send({ success: true, data: { message: `Job ${id} queued for retry` } });
  });

  // DELETE /jobs/:id — remove a job from queue
  fastify.delete('/jobs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const queue = getTaskQueue();

    const job = await queue.getJob(id);
    if (!job) return reply.code(404).send({ success: false, error: 'Job not found' });

    await job.remove();
    return reply.send({ success: true, data: { message: `Job ${id} removed` } });
  });

  // POST /drain — drain all waiting jobs (admin only, use with caution)
  fastify.post('/drain', async (_request: FastifyRequest, reply: FastifyReply) => {
    const queue = getTaskQueue();
    await queue.drain();
    return reply.send({ success: true, data: { message: 'Queue drained' } });
  });
}
