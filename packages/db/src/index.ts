import { PrismaClient } from '@prisma/client';

// ─── Prisma Singleton ─────────────────────────────────────────────────────────
// Prevents multiple instances in development due to hot reloading.
// In production (Neon + serverless), uses connection pooling settings that
// allow idle connections to close and reduce cost.

declare global {
  var __prisma: PrismaClient | undefined;
}

const logLevels = process.env.NODE_ENV === 'production'
  ? (['error', 'warn'] as const)
  : (['error', 'warn'] as const); // Reduce query logging even in dev (noisy with streaming)

export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient({
  log: logLevels as any,
  // Connection pool tuning for Neon serverless:
  // - datasourceUrl can be overridden here if needed, but we use schema.prisma env
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export * from '@prisma/client';
export default prisma;
