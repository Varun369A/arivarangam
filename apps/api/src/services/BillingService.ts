import crypto from 'crypto';
import Razorpay from 'razorpay';
import { prisma } from '@arrivarangam/db';
import { Prisma } from '@prisma/client';
import type { CreditPack } from '@arrivarangam/types';
import { getConfig } from '@arrivarangam/config';
import { creditService } from './CreditService';

// ─── Credit Packs ─────────────────────────────────────────────────────────────

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'trial',
    name: 'Trial',
    price_inr: 99,
    credits: 300,
    popular: false,
    description: 'Try out the platform',
  },
  {
    id: 'starter',
    name: 'Starter',
    price_inr: 299,
    credits: 1000,
    popular: false,
    description: 'Perfect for small projects',
  },
  {
    id: 'pro',
    name: 'Pro',
    price_inr: 699,
    credits: 3000,
    popular: true,
    description: 'Best value for regular use',
  },
  {
    id: 'business',
    name: 'Business',
    price_inr: 1499,
    credits: 8000,
    popular: false,
    description: 'For teams and heavy users',
  },
];

// ─── BillingService ───────────────────────────────────────────────────────────

export class BillingService {
  private getRazorpay(): Razorpay {
    const config = getConfig();
    return new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    });
  }

  // ─── Create Order ─────────────────────────────────────────────────────────────

  async createOrder(
    userId: string,
    packId: string,
    ipAddress: string
  ): Promise<{ orderId: string; amount: number; currency: string; keyId: string }> {
    const config = getConfig();

    // Find pack
    const pack = CREDIT_PACKS.find(p => p.id === packId);
    if (!pack) throw new Error(`Unknown credit pack: ${packId}`);

    // Check anti-abuse rate limits
    await creditService.checkPurchaseRateLimit(userId, ipAddress);

    const razorpay = this.getRazorpay();

    let razorpayOrder: any;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: pack.price_inr * 100, // Razorpay uses paise
        currency: 'INR',
        receipt: `arrivarangam_${userId}_${packId}_${Date.now()}`,
        notes: {
          userId,
          packId,
          credits: String(pack.credits),
        },
      });
    } catch (err: any) {
      // Rollback rate limit increment since order creation failed
      await creditService.rollbackPurchaseRateLimit(userId, ipAddress);
      throw new Error(`Razorpay order creation failed: ${err?.message ?? err}`);
    }

    // Save pending transaction
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    });
    if (!user) throw new Error('User not found');

    await prisma.creditTransaction.create({
      data: {
        userId,
        type: 'PURCHASE',
        amount: pack.credits,
        balanceBefore: user.credits,
        balanceAfter: user.credits + pack.credits,
        description: `Purchase: ${pack.name} pack (${pack.credits} credits)`,
        razorpayOrderId: razorpayOrder.id,
        packId,
        status: 'PENDING',
        metadata: { priceInr: pack.price_inr, ipAddress },
      },
    });

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: config.RAZORPAY_KEY_ID,
    };
  }

  // ─── Verify Payment ───────────────────────────────────────────────────────────

  async verifyPayment(
    orderId: string,
    paymentId: string,
    signature: string,
    userId: string
  ): Promise<void> {
    const config = getConfig();

    // Verify HMAC-SHA256 signature
    const expectedSignature = crypto
      .createHmac('sha256', config.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new Error('Invalid payment signature');
    }

    // Idempotency: check if already processed
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: `verify:${paymentId}` },
    });
    if (existing) {
      console.log(`[Billing] Payment ${paymentId} already processed, skipping`);
      return;
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Mark webhook event as processed
      await tx.webhookEvent.create({
        data: {
          provider: 'razorpay',
          eventId: `verify:${paymentId}`,
          payload: { orderId, paymentId, signature },
          processedAt: new Date(),
        },
      });

      // Find pending transaction
      const pendingTx = await tx.creditTransaction.findFirst({
        where: {
          userId,
          razorpayOrderId: orderId,
          status: 'PENDING',
          type: 'PURCHASE',
        },
      });

      if (!pendingTx) {
        throw new Error(`No pending transaction found for order ${orderId}`);
      }

      // Get current balance
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });
      if (!user) throw new Error('User not found');

      const newBalance = user.credits + pendingTx.amount;

      // Credit user
      await tx.user.update({
        where: { id: userId },
        data: { credits: newBalance },
      });

      // Update transaction
      await tx.creditTransaction.update({
        where: { id: pendingTx.id },
        data: {
          razorpayPaymentId: paymentId,
          razorpaySignature: signature,
          balanceBefore: user.credits,
          balanceAfter: newBalance,
          status: 'COMPLETED',
        },
      });
    });
  }

  // ─── Handle Webhook ───────────────────────────────────────────────────────────

  async handleWebhook(payload: any, signature: string): Promise<void> {
    const config = getConfig();

    // Verify webhook signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expectedSig = crypto
      .createHmac('sha256', config.RAZORPAY_WEBHOOK_SECRET)
      .update(payloadString)
      .digest('hex');

    if (expectedSig !== signature) {
      throw new Error('Invalid webhook signature');
    }

    const parsedPayload = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const eventId: string = parsedPayload.payload?.payment?.entity?.id
      ?? parsedPayload.payload?.refund?.entity?.id
      ?? `webhook:${Date.now()}:${Math.random()}`;

    const webhookKey = `webhook:${parsedPayload.event}:${eventId}`;

    // Idempotency check
    const existing = await prisma.webhookEvent.findUnique({
      where: { eventId: webhookKey },
    });
    if (existing) {
      console.log(`[Billing] Webhook ${webhookKey} already processed`);
      return;
    }

    // Save webhook event
    await prisma.webhookEvent.create({
      data: {
        provider: 'razorpay',
        eventId: webhookKey,
        payload: parsedPayload,
        processedAt: new Date(),
      },
    });

    const event = parsedPayload.event as string;

    if (event === 'payment.captured') {
      await this.handlePaymentCaptured(parsedPayload.payload?.payment?.entity);
    } else if (event === 'payment.failed') {
      await this.handlePaymentFailed(parsedPayload.payload?.payment?.entity);
    } else if (event === 'refund.created') {
      await this.handleRefundCreated(parsedPayload.payload?.refund?.entity);
    } else if (event === 'payment.dispute.created' || event === 'payment.dispute.accepted') {
      await this.handleChargeback(parsedPayload.payload?.dispute?.entity);
    }
  }

  // ─── Internal Handlers ────────────────────────────────────────────────────────

  private async handlePaymentCaptured(paymentEntity: any): Promise<void> {
    if (!paymentEntity) return;

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;

    // Check if already credited via verify
    const alreadyCredited = await prisma.webhookEvent.findFirst({
      where: { eventId: `verify:${paymentId}` },
    });
    if (alreadyCredited) {
      console.log(`[Billing] Payment ${paymentId} already credited via verify endpoint`);
      return;
    }

    // Find pending transaction by order ID
    const pendingTx = await prisma.creditTransaction.findFirst({
      where: {
        razorpayOrderId: orderId,
        status: 'PENDING',
        type: 'PURCHASE',
      },
    });

    if (!pendingTx) {
      console.warn(`[Billing] No pending transaction for captured order ${orderId}`);
      return;
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findUnique({
        where: { id: pendingTx.userId },
        select: { credits: true },
      });
      if (!user) return;

      const newBalance = user.credits + pendingTx.amount;

      await tx.user.update({
        where: { id: pendingTx.userId },
        data: { credits: newBalance },
      });

      await tx.creditTransaction.update({
        where: { id: pendingTx.id },
        data: {
          razorpayPaymentId: paymentId,
          balanceBefore: user.credits,
          balanceAfter: newBalance,
          status: 'COMPLETED',
        },
      });
    });
  }

  private async handlePaymentFailed(paymentEntity: any): Promise<void> {
    if (!paymentEntity) return;

    const orderId = paymentEntity.order_id;

    await prisma.creditTransaction.updateMany({
      where: {
        razorpayOrderId: orderId,
        status: 'PENDING',
        type: 'PURCHASE',
      },
      data: { status: 'FAILED' },
    });
  }

  private async handleRefundCreated(refundEntity: any): Promise<void> {
    if (!refundEntity) return;

    const paymentId = refundEntity.payment_id;

    const originalTx = await prisma.creditTransaction.findFirst({
      where: { razorpayPaymentId: paymentId, status: 'COMPLETED' },
    });

    if (!originalTx) return;

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Deduct refunded credits
      const user = await tx.user.findUnique({
        where: { id: originalTx.userId },
        select: { credits: true },
      });
      if (!user) return;

      const refundCredits = originalTx.amount;
      const newBalance = Math.max(0, user.credits - refundCredits);

      await tx.user.update({
        where: { id: originalTx.userId },
        data: { credits: newBalance },
      });

      await tx.creditTransaction.update({
        where: { id: originalTx.id },
        data: { status: 'REFUNDED' },
      });

      await tx.creditTransaction.create({
        data: {
          userId: originalTx.userId,
          type: 'REFUND',
          amount: -refundCredits,
          balanceBefore: user.credits,
          balanceAfter: newBalance,
          description: `Refund for payment ${paymentId}`,
          razorpayPaymentId: paymentId,
          status: 'COMPLETED',
        },
      });
    });
  }

  private async handleChargeback(disputeEntity: any): Promise<void> {
    if (!disputeEntity) return;

    const paymentId = disputeEntity.payment_id;

    const originalTx = await prisma.creditTransaction.findFirst({
      where: { razorpayPaymentId: paymentId },
      include: { user: { select: { id: true } } },
    });

    if (!originalTx) return;

    // Freeze the account
    await prisma.user.update({
      where: { id: originalTx.userId },
      data: { status: 'SUSPENDED' },
    });

    // Log security event
    await prisma.securityEvent.create({
      data: {
        userId: originalTx.userId,
        type: 'CHARGEBACK',
        severity: 'CRITICAL',
        description: `Chargeback detected for payment ${paymentId}. Account frozen.`,
        metadata: { disputeEntity },
      },
    });

    console.error(`[Billing] CHARGEBACK: User ${originalTx.userId} account frozen for payment ${paymentId}`);
  }
}

export const billingService = new BillingService();
