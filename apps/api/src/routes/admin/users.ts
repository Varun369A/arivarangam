import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arivarangam/db';
import { creditService } from '../../services/CreditService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const listUsersSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  tier: z.enum(['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ADMIN']).optional(),
  status: z.enum(['ACTIVE', 'SUSPENDED', 'DELETED']).optional(),
});

const changeTierSchema = z.object({
  tier: z.enum(['FREE', 'STARTER', 'PRO', 'BUSINESS', 'ADMIN']),
});

const grantCreditsSchema = z.object({
  amount: z.number().int().min(-100000).max(100000),
  reason: z.string().min(1, 'Reason is required').max(500),
});

// ─── Admin Users Routes ───────────────────────────────────────────────────────

export async function adminUsersRoutes(fastify: FastifyInstance): Promise<void> {

  // GET / — paginated users list with search
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParse = listUsersSchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { page, limit, search, tier, status } = queryParse.data;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (tier) where.tier = tier;
    if (status) where.status = status;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          email: true,
          tier: true,
          credits: true,
          totalCreditsUsed: true,
          isAdmin: true,
          isEmailVerified: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: { tasks: true, repos: true, transactions: true },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: { users, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /:id — user detail with usage stats
  fastify.get('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { tasks: true, repos: true, transactions: true },
        },
      },
    });

    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    // Get purchase total
    const purchaseAgg = await prisma.creditTransaction.aggregate({
      where: { userId: id, type: 'PURCHASE', status: 'COMPLETED' },
      _sum: { amount: true },
      _count: true,
    });

    // Get recent tasks
    const recentTasks = await prisma.task.findMany({
      where: { userId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, category: true, status: true, prompt: true, creditsActuallyUsed: true, createdAt: true },
    });

    // Remove sensitive fields
    const { password, resetToken, emailVerifyToken, ...safeUser } = user;

    return reply.send({
      success: true,
      data: {
        user: safeUser,
        stats: {
          tasksCount: user._count.tasks,
          reposCount: user._count.repos,
          totalTransactions: user._count.transactions,
          totalCreditsPurchased: purchaseAgg._sum.amount ?? 0,
          totalPurchases: purchaseAgg._count,
        },
        recentTasks,
      },
    });
  });

  // PATCH /:id/tier — change tier
  fastify.patch('/:id/tier', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const parseResult = changeTierSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.code(400).send({ success: false, error: 'Valid tier is required' });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { tier: parseResult.data.tier },
      select: { id: true, email: true, tier: true },
    });

    return reply.send({ success: true, data: { user: updated, message: `Tier updated to ${parseResult.data.tier}` } });
  });

  // POST /:id/credits — grant/deduct credits
  fastify.post('/:id/credits', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const adminUser = (request as any).user;

    const parseResult = grantCreditsSchema.safeParse(request.body);
    if (!parseResult.success) {
      const errors: Record<string, string> = {};
      parseResult.error.errors.forEach(e => { errors[e.path.join('.')] = e.message; });
      return reply.code(400).send({ success: false, error: 'Validation failed', details: errors });
    }

    const { amount, reason } = parseResult.data;

    try {
      await creditService.adminGrantCredits(id, amount, `[Admin: ${adminUser.email}] ${reason}`);
      const newBalance = await creditService.getBalance(id);

      return reply.send({
        success: true,
        data: {
          newBalance,
          message: `${amount > 0 ? 'Granted' : 'Deducted'} ${Math.abs(amount)} credits. New balance: ${newBalance}`,
        },
      });
    } catch (err: any) {
      if (err.message.includes('not found')) {
        return reply.code(404).send({ success: false, error: 'User not found' });
      }
      throw err;
    }
  });

  // POST /:id/suspend — suspend account
  fastify.post('/:id/suspend', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = request.body as any;

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true, isAdmin: true } });
    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    if (user.isAdmin) {
      return reply.code(400).send({ success: false, error: 'Cannot suspend admin accounts', code: 'CANNOT_SUSPEND_ADMIN' });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'SUSPENDED' },
    });

    // Log security event
    await prisma.securityEvent.create({
      data: {
        userId: id,
        type: 'ACCOUNT_FROZEN',
        severity: 'HIGH',
        description: `Account suspended by admin. Reason: ${body?.reason ?? 'No reason provided'}`,
        metadata: { adminId: (request as any).user?.id },
      },
    });

    return reply.send({ success: true, data: { message: `Account ${user.email} suspended` } });
  });

  // POST /:id/activate — reactivate account
  fastify.post('/:id/activate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    return reply.send({ success: true, data: { message: `Account ${user.email} reactivated` } });
  });

  // DELETE /:id — soft delete
  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const adminUser = (request as any).user;

    // Cannot delete yourself
    if (id === adminUser.id) {
      return reply.code(400).send({ success: false, error: 'Cannot delete your own account', code: 'SELF_DELETE' });
    }

    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, email: true } });
    if (!user) {
      return reply.code(404).send({ success: false, error: 'User not found' });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'DELETED', email: `deleted_${Date.now()}_${user.email}` },
    });

    return reply.send({ success: true, data: { message: `Account ${user.email} deleted` } });
  });
}
