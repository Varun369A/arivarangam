import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arrivarangam/db';
import { CREDIT_PACKS } from '../../services/BillingService';

// ─── Schemas ──────────────────────────────────────────────────────────────────

const transactionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.enum(['PURCHASE', 'USAGE', 'REFUND', 'SIGNUP_BONUS', 'ADMIN_GRANT']).optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']).optional(),
  userId: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ─── Admin Billing Routes ────────────────────────────────────────────────────

export async function adminBillingRoutes(fastify: FastifyInstance): Promise<void> {

  // GET /revenue — daily/monthly revenue summary
  fastify.get('/revenue', async (request: FastifyRequest, reply: FastifyReply) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const [
      todayTxns,
      thisMonthTxns,
      lastMonthTxns,
      allTimeTxns,
      byPackRaw,
    ] = await Promise.all([
      // Today's revenue
      prisma.creditTransaction.findMany({
        where: {
          type: 'PURCHASE',
          status: 'COMPLETED',
          createdAt: { gte: startOfToday },
        },
        select: { amount: true, packId: true, metadata: true },
      }),
      // This month
      prisma.creditTransaction.findMany({
        where: {
          type: 'PURCHASE',
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth },
        },
        select: { amount: true, packId: true, metadata: true },
      }),
      // Last month
      prisma.creditTransaction.findMany({
        where: {
          type: 'PURCHASE',
          status: 'COMPLETED',
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        select: { amount: true, packId: true, metadata: true },
      }),
      // All time
      prisma.creditTransaction.findMany({
        where: { type: 'PURCHASE', status: 'COMPLETED' },
        select: { amount: true, packId: true, metadata: true },
      }),
      // By pack (last 30 days)
      prisma.creditTransaction.groupBy({
        by: ['packId'],
        where: {
          type: 'PURCHASE',
          status: 'COMPLETED',
          packId: { not: null },
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: true,
        _sum: { amount: true },
      }),
    ]);

    const calcRevenue = (txns: { metadata: any }[]) =>
      txns.reduce((sum, t) => sum + ((t.metadata as any)?.priceInr ?? 0), 0);

    // Daily breakdown (last 30 days)
    const dailyMap: Record<string, number> = {};
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentPurchases = await prisma.creditTransaction.findMany({
      where: {
        type: 'PURCHASE',
        status: 'COMPLETED',
        createdAt: { gte: thirtyDaysAgo },
      },
      select: { createdAt: true, metadata: true },
    });

    for (const p of recentPurchases) {
      const dateKey = p.createdAt.toISOString().slice(0, 10);
      dailyMap[dateKey] = (dailyMap[dateKey] ?? 0) + ((p.metadata as any)?.priceInr ?? 0);
    }

    const dailyBreakdown = Object.entries(dailyMap)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const byPack = byPackRaw.map(row => {
      const pack = CREDIT_PACKS.find(p => p.id === row.packId);
      return {
        packId: row.packId ?? 'unknown',
        packName: pack?.name ?? 'Unknown',
        count: row._count,
        totalCredits: row._sum.amount ?? 0,
        totalInr: (row._count) * (pack?.price_inr ?? 0),
      };
    });

    return reply.send({
      success: true,
      data: {
        today: calcRevenue(todayTxns),
        thisMonth: calcRevenue(thisMonthTxns),
        lastMonth: calcRevenue(lastMonthTxns),
        allTime: calcRevenue(allTimeTxns),
        byPack,
        dailyBreakdown,
      },
    });
  });

  // GET /transactions — all transactions with filters
  fastify.get('/transactions', async (request: FastifyRequest, reply: FastifyReply) => {
    const queryParse = transactionsQuerySchema.safeParse(request.query);
    if (!queryParse.success) {
      return reply.code(400).send({ success: false, error: 'Invalid query parameters' });
    }

    const { page, limit, type, status, userId, from, to } = queryParse.data;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;
    if (userId) where.userId = userId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      prisma.creditTransaction.count({ where }),
    ]);

    return reply.send({
      success: true,
      data: { transactions, total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  });

  // GET /packs/stats — purchases per pack
  fastify.get('/packs/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const packStats = await prisma.creditTransaction.groupBy({
      by: ['packId'],
      where: {
        type: 'PURCHASE',
        status: 'COMPLETED',
        packId: { not: null },
      },
      _count: true,
      _sum: { amount: true },
    });

    const stats = packStats.map(row => {
      const pack = CREDIT_PACKS.find(p => p.id === row.packId);
      return {
        packId: row.packId,
        packName: pack?.name ?? 'Unknown',
        priceInr: pack?.price_inr ?? 0,
        credits: pack?.credits ?? 0,
        totalPurchases: row._count,
        totalCreditsIssued: row._sum.amount ?? 0,
        totalRevenueInr: (row._count) * (pack?.price_inr ?? 0),
      };
    });

    // Add zero-count packs
    for (const pack of CREDIT_PACKS) {
      if (!stats.find(s => s.packId === pack.id)) {
        stats.push({
          packId: pack.id,
          packName: pack.name,
          priceInr: pack.price_inr,
          credits: pack.credits,
          totalPurchases: 0,
          totalCreditsIssued: 0,
          totalRevenueInr: 0,
        });
      }
    }

    return reply.send({ success: true, data: { stats } });
  });
}
