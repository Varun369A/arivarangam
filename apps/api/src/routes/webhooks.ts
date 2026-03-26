import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { billingService } from '../services/BillingService';

// ─── Webhook Routes ───────────────────────────────────────────────────────────

export async function webhookRoutes(fastify: FastifyInstance): Promise<void> {

  // POST /razorpay — Razorpay webhook handler
  fastify.post('/razorpay', {
    config: { rawBody: true }, // Need raw body for signature verification
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const signature = request.headers['x-razorpay-signature'] as string;

    if (!signature) {
      return reply.code(400).send({ error: 'Missing webhook signature' });
    }

    // Use raw body for signature verification if available, else stringify
    const rawBody = (request as any).rawBody ?? JSON.stringify(request.body);

    try {
      await billingService.handleWebhook(rawBody, signature);
      return reply.send({ status: 'ok' });
    } catch (err: any) {
      if (err.message.includes('Invalid webhook signature')) {
        console.warn('[Webhook] Invalid Razorpay signature received');
        return reply.code(400).send({ error: 'Invalid signature' });
      }

      console.error('[Webhook] Razorpay handler error:', err);
      // Return 200 to prevent Razorpay from retrying for non-signature errors
      return reply.send({ status: 'error', message: err.message });
    }
  });
}
