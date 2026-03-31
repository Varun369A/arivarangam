import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '@arivarangam/db';
import { requireAuth } from '../middleware/auth';
import crypto from 'crypto';

// ─── Encryption helpers ────────────────────────────────────────────────────────
// AES-256-GCM encryption for env var values at rest

function getEncryptionKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'default-encryption-key-32-chars!!';
  // Derive a 32-byte key from whatever string we have
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Store as iv:tag:ciphertext (all hex)
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encoded: string): string {
  try {
    const [ivHex, tagHex, ctHex] = encoded.split(':');
    if (!ivHex || !tagHex || !ctHex) throw new Error('Invalid format');
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const ct = Buffer.from(ctHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    return decipher.update(ct).toString('utf8') + decipher.final('utf8');
  } catch {
    return '[encrypted]';
  }
}

function maskValue(value: string): string {
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '****' + value.slice(-4);
}

// ─── Known services catalog ────────────────────────────────────────────────────

const SERVICE_CATALOG: Record<string, { label: string; envKeys: string[]; docsUrl: string; getUrl: string }> = {
  openai:      { label: 'OpenAI',       envKeys: ['OPENAI_API_KEY'],               docsUrl: 'https://platform.openai.com/docs', getUrl: 'https://platform.openai.com/api-keys' },
  anthropic:   { label: 'Anthropic',    envKeys: ['ANTHROPIC_API_KEY'],            docsUrl: 'https://docs.anthropic.com',       getUrl: 'https://console.anthropic.com/keys' },
  stripe:      { label: 'Stripe',       envKeys: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET'], docsUrl: 'https://stripe.com/docs', getUrl: 'https://dashboard.stripe.com/apikeys' },
  supabase:    { label: 'Supabase',     envKeys: ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY'], docsUrl: 'https://supabase.com/docs', getUrl: 'https://supabase.com/dashboard/project/_/settings/api' },
  firebase:    { label: 'Firebase',     envKeys: ['FIREBASE_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_APP_ID'], docsUrl: 'https://firebase.google.com/docs', getUrl: 'https://console.firebase.google.com' },
  aws:         { label: 'AWS',          envKeys: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION'], docsUrl: 'https://docs.aws.amazon.com', getUrl: 'https://console.aws.amazon.com/iam/home#/security_credentials' },
  mongodb:     { label: 'MongoDB',      envKeys: ['MONGODB_URI', 'MONGODB_DATABASE'], docsUrl: 'https://www.mongodb.com/docs', getUrl: 'https://cloud.mongodb.com' },
  twilio:      { label: 'Twilio',       envKeys: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_PHONE_NUMBER'], docsUrl: 'https://www.twilio.com/docs', getUrl: 'https://console.twilio.com' },
  sendgrid:    { label: 'SendGrid',     envKeys: ['SENDGRID_API_KEY'],             docsUrl: 'https://docs.sendgrid.com',        getUrl: 'https://app.sendgrid.com/settings/api_keys' },
  razorpay:    { label: 'Razorpay',     envKeys: ['RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET'], docsUrl: 'https://razorpay.com/docs', getUrl: 'https://dashboard.razorpay.com/app/keys' },
  cloudinary:  { label: 'Cloudinary',   envKeys: ['CLOUDINARY_URL', 'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'], docsUrl: 'https://cloudinary.com/documentation', getUrl: 'https://console.cloudinary.com/pm/developer-dashboard' },
  github:      { label: 'GitHub',       envKeys: ['GITHUB_TOKEN', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'], docsUrl: 'https://docs.github.com', getUrl: 'https://github.com/settings/tokens' },
  google:      { label: 'Google',       envKeys: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_API_KEY'], docsUrl: 'https://developers.google.com', getUrl: 'https://console.developers.google.com/apis/credentials' },
  sarvam:      { label: 'Sarvam AI',    envKeys: ['SARVAM_API_KEY'],               docsUrl: 'https://docs.sarvam.ai',           getUrl: 'https://app.sarvam.ai/dashboard' },
  perplexity:  { label: 'Perplexity',   envKeys: ['PERPLEXITY_API_KEY'],           docsUrl: 'https://docs.perplexity.ai',       getUrl: 'https://www.perplexity.ai/api' },
  vercel:      { label: 'Vercel',       envKeys: ['VERCEL_TOKEN'],                 docsUrl: 'https://vercel.com/docs/rest-api',  getUrl: 'https://vercel.com/account/tokens' },
  railway:     { label: 'Railway',      envKeys: ['RAILWAY_TOKEN'],                docsUrl: 'https://docs.railway.app/reference/public-api', getUrl: 'https://railway.app/account/tokens' },
  cloudflare:  { label: 'Cloudflare',   envKeys: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'], docsUrl: 'https://developers.cloudflare.com/workers', getUrl: 'https://dash.cloudflare.com/profile/api-tokens' },
  expo:        { label: 'Expo',         envKeys: ['EXPO_TOKEN'],                   docsUrl: 'https://docs.expo.dev',            getUrl: 'https://expo.dev/accounts/[account]/settings/access-tokens' },
};

function detectService(key: string): string | null {
  for (const [svcId, svc] of Object.entries(SERVICE_CATALOG)) {
    if (svc.envKeys.some(k => k === key || key.toLowerCase().includes(svcId))) {
      return svcId;
    }
  }
  return null;
}

// ─── Schemas ──────────────────────────────────────────────────────────────────

const upsertSchema = z.object({
  key:     z.string().min(1).max(200).regex(/^[A-Z_][A-Z0-9_]*$/, 'Key must be uppercase letters, digits, and underscores'),
  value:   z.string().min(1).max(5000),
  service: z.string().max(50).optional(),
  label:   z.string().max(100).optional(),
});

// ─── Route Plugin ─────────────────────────────────────────────────────────────

export async function envVarRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);

  // GET / — list all env vars for the user (values masked)
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const vars = await prisma.userEnvVar.findMany({
      where: { userId: user.id },
      orderBy: { key: 'asc' },
    });

    const result = vars.map(v => {
      let decrypted = '';
      try { decrypted = decrypt(v.value); } catch { decrypted = ''; }
      return {
        id: v.id,
        key: v.key,
        maskedValue: maskValue(decrypted),
        service: v.service,
        label: v.label,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      };
    });

    return reply.send({ success: true, data: { vars: result, catalog: SERVICE_CATALOG } });
  });

  // POST / — create or update a var
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const parse = upsertSchema.safeParse(request.body);
    if (!parse.success) {
      return reply.code(400).send({ success: false, error: parse.error.errors[0]?.message ?? 'Invalid input' });
    }

    const { key, value, label } = parse.data;
    const service = parse.data.service ?? detectService(key) ?? undefined;
    const encrypted = encrypt(value);

    const envVar = await prisma.userEnvVar.upsert({
      where: { userId_key: { userId: user.id, key } },
      create: { userId: user.id, key, value: encrypted, service, label },
      update: { value: encrypted, service, label },
    });

    return reply.code(201).send({
      success: true,
      data: {
        id: envVar.id,
        key: envVar.key,
        maskedValue: maskValue(value),
        service: envVar.service,
        label: envVar.label,
      },
    });
  });

  // DELETE /:key — delete a var by key name
  fastify.delete('/:key', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;
    const { key } = request.params as { key: string };

    const deleted = await prisma.userEnvVar.deleteMany({
      where: { userId: user.id, key },
    });

    if (deleted.count === 0) {
      return reply.code(404).send({ success: false, error: 'Variable not found' });
    }

    return reply.send({ success: true, data: { message: `${key} deleted` } });
  });

  // GET /detect — analyze latest completed task code for env var references
  fastify.get('/detect', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = (request as any).user;

    const latestTask = await prisma.task.findFirst({
      where: { userId: user.id, status: 'completed' },
      orderBy: { completedAt: 'desc' },
      select: { metadata: true, category: true },
    });

    const detected: string[] = [];

    if (latestTask?.metadata) {
      const files = (latestTask.metadata as any)?.files ?? [];
      const allCode = files.map((f: any) => f.content ?? '').join('\n');

      // Match common env var patterns
      const patterns = [
        /process\.env\.([A-Z_][A-Z0-9_]{2,})/g,
        /process\['([A-Z_][A-Z0-9_]{2,})'\]/g,
        /import\.meta\.env\.([A-Z_][A-Z0-9_]{2,})/g,
        /os\.environ(?:\.get)?\(['"]([A-Z_][A-Z0-9_]{2,})['"]\)/g,
        /getenv\(['"]([A-Z_][A-Z0-9_]{2,})['"]\)/g,
        /\benv\s*=\s*os\.environ\b/g,
      ];

      const found = new Set<string>();
      for (const pattern of patterns) {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        while ((match = regex.exec(allCode)) !== null) {
          if (match[1]) found.add(match[1]);
        }
      }

      // Also add service-based keys from catalog if service names appear in code
      const lowerCode = allCode.toLowerCase();
      for (const [svcId, svc] of Object.entries(SERVICE_CATALOG)) {
        if (lowerCode.includes(svcId) || lowerCode.includes(svc.label.toLowerCase())) {
          svc.envKeys.forEach(k => found.add(k));
        }
      }

      detected.push(...found);
    }

    // Find which ones the user already has
    const existing = await prisma.userEnvVar.findMany({
      where: { userId: user.id },
      select: { key: true },
    });
    const existingKeys = new Set(existing.map(e => e.key));

    const missing = detected.filter(k => !existingKeys.has(k));

    return reply.send({
      success: true,
      data: {
        detected,
        missing,
        catalog: SERVICE_CATALOG,
      },
    });
  });
}
