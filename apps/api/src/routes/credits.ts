import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arrivarangam/db';
import { requireAuth } from '../middleware/auth';
import { creditService } from '../services/CreditService';
import { billingService, CREDIT_PACKS } from '../services/BillingService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const estimateSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').max(5000),
  category: z.enum(['code', 'research', 'image', 'voice', 'content']),
});

const createOrderSchema = z.object({
  packId: z.string().min(1, 'Pack ID is required'),
});

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
});

const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function creditRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);

  // GET /balance — current balance + recent transactions
  fastify.get('/balance', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const [balance, recentTransactions] = await Promise.all([
      creditService.getBalance(user.id),
      prisma.creditTransaction.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          type: true,
          amount: true,
          balanceAfter: true,
          description: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return reply.send({
      success: true,
      data: { balance, recentTransactions },
    });
  });

  // POST /estimate — estimate credits for a task
  fastify.post('/estimate', async (request: FastifyRequest, reply: FastifyReply) => {
    const parseResult = estimateSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { prompt, category } = parseResult.data;

    const estimate = await creditService.estimateTask(prompt, category);

    return reply.send({ success: true, data: { estimate } });
  });

  // GET /packs — list available credit packs
  fastify.get('/packs', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      success: true,
      data: { packs: CREDIT_PACKS },
    });
  });

  // POST /purchase/create-order
  fastify.post('/purchase/create-order', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const parseResult = createOrderSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Pack ID is required' });
    }

    const { packId } = parseResult.data;
    const ipAddress = request.ip ?? '0.0.0.0';

    try {
      const order = await billingService.createOrder(user.id, packId, ipAddress);
      return reply.send({ success: true, data: order });
    } catch (err: any) {
      if (err.message.includes('rate limit')) {
        return reply.code(429).send({ success: false, error: err.message, code: 'RATE_LIMIT' });
      }
      if (err.message.includes('Unknown credit pack')) {
        return reply.code(400).send({ success: false, error: err.message, code: 'INVALID_PACK' });
      }
      throw err;
    }
  });

  // POST /purchase/verify
  fastify.post('/purchase/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const parseResult = verifyPaymentSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { orderId, paymentId, signature } = parseResult.data;

    try {
      await billingService.verifyPayment(orderId, paymentId, signature, user.id);

      const newBalance = await creditService.getBalance(user.id);

      return reply.send({
        success: true,
        data: {
          message: 'Payment verified and credits added',
          newBalance,
        },
      });
    } catch (err: any) {
      if (err.message.includes('Invalid payment signature')) {
        return reply.code(400).send({ success: false, error: 'Payment verification failed', code: 'INVALID_SIGNATURE' });
      }
      throw err;
    }
  });

  // GET /transactions — paginated history
  fastify.get('/transactions', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const queryParse = transactionsQuerySchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { page, limit } = queryParse.data;

    const { transactions, total } = await creditService.getTransactionHistory(user.id, page, limit);

    return reply.send({
      success: true,
      data: {
        transactions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  });
}
