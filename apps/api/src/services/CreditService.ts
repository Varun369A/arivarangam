import { prisma } from '@arivarangam/db';
import { Prisma } from '@prisma/client';
import type { CreditEstimate, TaskCategory } from '@arivarangam/types';
import { callClaudeHaiku } from '../connectors/claude';
import { getRedis, PURCHASE_RATE_KEY, PURCHASE_IP_KEY } from '../redis';

// ─── CreditService ────────────────────────────────────────────────────────────

export class CreditService {
  // ─── Balance ────────────────────────────────────────────────────────────────

  async getBalance(userId: string): Promise<number> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if (!user) throw new Error('User not found');
    return user.credits;
  }

  // ─── Estimate Task Credits ───────────────────────────────────────────────────

  async estimateTask(prompt: string, category: TaskCategory): Promise<CreditEstimate> {
    // Use Claude Haiku to analyze prompt complexity
    const systemPrompt = `You are a credit cost estimator for an AI platform. Analyze the given task and return ONLY a JSON object with credit estimates.

Credit costs by category:
- code: 80-200 credits (simple scripts = 80, full immersive web app = 200)
- mobile: 100-220 credits (simple screens = 100, full Expo app = 220)
- presentation: 60-120 credits (short deck = 60, detailed 20+ slide Reveal.js = 120)
- agent: 80-150 credits (simple script = 80, multi-tool LangChain agent = 150)
- workflow: 50-100 credits (simple n8n workflow = 50, complex multi-node = 100)
- research: 50-80 credits (simple = 50, deep = 80)
- image: 80 credits (fixed)
- voice: 30 credits per minute of estimated audio
- content: 40-100 credits (short article = 40, long-form multi-file = 100)
- animation: 80-180 credits (simple canvas = 80, complex Three.js scene = 180)
- dataviz: 60-140 credits (simple Chart.js bar chart = 60, complex D3 force graph with filters = 140)

Return ONLY this JSON (no markdown, no explanation):
{"min": number, "max": number, "typical": number}`;

    let estimate: CreditEstimate;

    try {
      const response = await callClaudeHaiku(
        `Category: ${category}\n\nTask prompt: ${prompt.slice(0, 500)}`,
        systemPrompt,
        256
      );

      // Strip markdown fences if present
      const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const parsed = JSON.parse(cleaned);

      estimate = {
        min: Math.max(1, Math.round(parsed.min ?? 5)),
        max: Math.max(1, Math.round(parsed.max ?? 50)),
        typical: Math.max(1, Math.round(parsed.typical ?? 25)),
        disclaimer:
          'Credit usage is estimated and may vary based on actual task complexity. ' +
          'You will only be charged for credits actually used.',
      };
    } catch (err) {
      // Fallback estimates if Claude fails
      const fallbacks: Record<TaskCategory, { min: number; max: number; typical: number }> = {
        code: { min: 80, max: 200, typical: 120 },
        mobile: { min: 100, max: 220, typical: 140 },
        presentation: { min: 60, max: 120, typical: 80 },
        agent: { min: 80, max: 150, typical: 110 },
        workflow: { min: 50, max: 100, typical: 65 },
        research: { min: 50, max: 80, typical: 60 },
        image: { min: 80, max: 80, typical: 80 },
        voice: { min: 30, max: 120, typical: 60 },
        content: { min: 40, max: 100, typical: 60 },
        animation: { min: 80, max: 180, typical: 110 },
        dataviz: { min: 60, max: 140, typical: 90 },
      };
      const fb = fallbacks[category];
      estimate = {
        ...fb,
        disclaimer:
          'Credit usage is estimated and may vary based on actual task complexity. ' +
          'You will only be charged for credits actually used.',
      };
    }

    return estimate;
  }

  // ─── Reserve Credits ─────────────────────────────────────────────────────────

  async reserveCredits(userId: string, taskId: string, amount: number): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) throw new Error('User not found');
      if (user.credits < amount) throw new Error(`Insufficient credits. Have ${user.credits}, need ${amount}`);

      const newBalance = user.credits - amount;

      await tx.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'USAGE',
          amount: -amount,
          balanceBefore: user.credits,
          balanceAfter: newBalance,
          description: `Reserved for task ${taskId}`,
          taskId,
          status: 'PENDING',
        },
      });
    });
  }

  // ─── Finalize Credits ─────────────────────────────────────────────────────────

  async finalizeCredits(userId: string, taskId: string, actualUsed: number): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Find the pending reservation transaction
      const reservation = await tx.creditTransaction.findFirst({
        where: {
          userId,
          taskId,
          type: 'USAGE',
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!reservation) {
        console.warn(`[CreditService] No pending reservation found for task ${taskId}`);
        return;
      }

      const reserved = Math.abs(reservation.amount);
      const refundAmount = reserved - actualUsed;

      // Update reservation to completed with actual amount
      await tx.creditTransaction.update({
        where: { id: reservation.id },
        data: {
          amount: -actualUsed,
          balanceAfter: reservation.balanceBefore - actualUsed,
          description: `Credits used for task ${taskId}`,
          status: 'COMPLETED',
        },
      });

      // Update user's totalCreditsUsed
      await tx.user.update({
        where: { id: userId },
        data: { totalCreditsUsed: { increment: actualUsed } },
      });

      // If we reserved more than used, refund the difference
      if (refundAmount > 0) {
        const currentUser = await tx.user.findUnique({
          where: { id: userId },
          select: { credits: true },
        });
        if (!currentUser) return;

        await tx.user.update({
          where: { id: userId },
          data: { credits: { increment: refundAmount } },
        });

        await tx.creditTransaction.create({
          data: {
            userId,
            type: 'REFUND',
            amount: refundAmount,
            balanceBefore: currentUser.credits,
            balanceAfter: currentUser.credits + refundAmount,
            description: `Refund: unused credits from task ${taskId}`,
            taskId,
            status: 'COMPLETED',
          },
        });
      }
    });
  }

  // ─── Release Reservation (task failed before running) ────────────────────────

  async releaseReservation(userId: string, taskId: string): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const reservation = await tx.creditTransaction.findFirst({
        where: {
          userId,
          taskId,
          type: 'USAGE',
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
      });

      if (!reservation) return; // Nothing to refund

      const refundAmount = Math.abs(reservation.amount);

      const currentUser = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      if (!currentUser) return;

      // Restore credits
      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: refundAmount } },
      });

      // Mark reservation as refunded
      await tx.creditTransaction.update({
        where: { id: reservation.id },
        data: { status: 'REFUNDED' },
      });

      // Create refund record
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'REFUND',
          amount: refundAmount,
          balanceBefore: currentUser.credits,
          balanceAfter: currentUser.credits + refundAmount,
          description: `Full refund: task ${taskId} was cancelled before running`,
          taskId,
          status: 'COMPLETED',
        },
      });
    });
  }

  // ─── Signup Bonus ─────────────────────────────────────────────────────────────

  async grantSignupBonus(userId: string): Promise<void> {
    const BONUS = 100;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      if (!user) throw new Error('User not found');

      // Check if bonus already granted
      const existing = await tx.creditTransaction.findFirst({
        where: { userId, type: 'SIGNUP_BONUS' },
      });
      if (existing) return; // Already granted

      await tx.user.update({
        where: { id: userId },
        data: { credits: { increment: BONUS } },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'SIGNUP_BONUS',
          amount: BONUS,
          balanceBefore: user.credits,
          balanceAfter: user.credits + BONUS,
          description: 'Welcome bonus — 100 free credits',
          status: 'COMPLETED',
        },
      });
    });
  }

  // ─── Admin Grant ───────────────────────────────────────────────────────────────

  async adminGrantCredits(userId: string, amount: number, reason: string): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      if (!user) throw new Error('User not found');

      const newBalance = user.credits + amount;

      await tx.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      });

      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'ADMIN_GRANT',
          amount,
          balanceBefore: user.credits,
          balanceAfter: newBalance,
          description: reason || `Admin grant of ${amount} credits`,
          status: 'COMPLETED',
        },
      });
    });
  }

  // ─── Transaction History ───────────────────────────────────────────────────────

  async getTransactionHistory(
    userId: string,
    page = 1,
    limit = 20
  ): Promise<{ transactions: any[]; total: number }> {
    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.creditTransaction.count({ where: { userId } }),
    ]);

    return { transactions, total };
  }

  // ─── Anti-Abuse: Purchase Rate Limit ─────────────────────────────────────────

  async checkPurchaseRateLimit(userId: string, ipAddress: string): Promise<void> {
    const redis = getRedis();
    const MAX_PER_USER = 3;   // per day
    const MAX_PER_IP = 5;     // per day
    const TTL = 86400;        // 24 hours in seconds

    const userKey = PURCHASE_RATE_KEY(userId);
    const ipKey = PURCHASE_IP_KEY(ipAddress);

    const [userCount, ipCount] = await Promise.all([
      redis.incr(userKey),
      redis.incr(ipKey),
    ]);

    // Set TTL on first increment
    if (userCount === 1) await redis.expire(userKey, TTL);
    if (ipCount === 1) await redis.expire(ipKey, TTL);

    if (userCount > MAX_PER_USER) {
      // Decrement to keep count accurate
      await redis.decr(userKey);
      throw new Error(`Purchase rate limit exceeded: max ${MAX_PER_USER} purchases per day per account`);
    }

    if (ipCount > MAX_PER_IP) {
      await redis.decr(userKey);
      await redis.decr(ipKey);
      throw new Error(`Purchase rate limit exceeded: max ${MAX_PER_IP} purchases per day from this IP`);
    }
  }

  // ─── Rollback Rate Limit (if order fails) ─────────────────────────────────────

  async rollbackPurchaseRateLimit(userId: string, ipAddress: string): Promise<void> {
    const redis = getRedis();
    await Promise.all([
      redis.decr(PURCHASE_RATE_KEY(userId)),
      redis.decr(PURCHASE_IP_KEY(ipAddress)),
    ]);
  }
}

export const creditService = new CreditService();
