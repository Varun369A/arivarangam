import { PrismaClient } from '@prisma/client';

// ─── Prisma Singleton ─────────────────────────────────────────────────────────
// Prevents multiple instances in development due to hot reloading.

declare global {
  var __prisma: PrismaClient | undefined;
}

const logLevels = process.env.NODE_ENV === 'production'
  ? (['error', 'warn'] as const)
  : (['query', 'error', 'warn'] as const);

export const prisma: PrismaClient = globalThis.__prisma ?? new PrismaClient({
  log: logLevels,
});

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma;
}

export * from '@prisma/client';
export default prisma;
