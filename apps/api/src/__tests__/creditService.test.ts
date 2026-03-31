import { describe, it, expect, vi } from 'vitest'

// ─── Mock all external dependencies ──────────────────────────────────────────

vi.mock('@arivarangam/db', () => ({
  prisma: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ credits: 0 }),
    },
    creditTransaction: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: null } }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(),
    },
    creditReservation: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  Prisma: { Decimal: class { constructor(v: any) {} } },
}))

vi.mock('@prisma/client', () => ({
  Prisma: { Decimal: class { constructor(v: any) {} } },
}))

vi.mock('@arivarangam/config', () => ({
  getConfig: vi.fn().mockReturnValue({ ANTHROPIC_API_KEY: 'test', NODE_ENV: 'test' }),
  config: new Proxy({}, { get: () => 'test' }),
}))

vi.mock('../connectors/claude', () => ({
  callClaudeHaiku: vi.fn().mockResolvedValue(
    JSON.stringify({ min: 60, max: 130, typical: 85, reasoning: 'test estimate' })
  ),
}))

vi.mock('../redis', () => ({
  getRedis: vi.fn().mockReturnValue({
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
  }),
  PURCHASE_RATE_KEY: (id: string) => `purchase:user:${id}`,
  PURCHASE_IP_KEY: (ip: string) => `purchase:ip:${ip}`,
}))

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('CreditService', () => {
  describe('getBalance', () => {
    it('returns user credits from DB', async () => {
      const { creditService } = await import('../services/CreditService')
      const balance = await creditService.getBalance('user-123')
      expect(balance).toBe(0)
    })
  })

  describe('estimateTask — fallback estimates', () => {
    it('logo estimate is min ≤ typical ≤ max', async () => {
      const { creditService } = await import('../services/CreditService')
      const est = await creditService.estimateTask('create a logo for my company', 'logo')
      expect(est.min).toBeGreaterThan(0)
      expect(est.typical).toBeGreaterThanOrEqual(est.min)
      expect(est.max).toBeGreaterThanOrEqual(est.typical)
    })

    it('all known categories return valid estimates', async () => {
      const { creditService } = await import('../services/CreditService')
      const categories = [
        'code', 'research', 'image', 'voice', 'content',
        'animation', 'dataviz', 'logo', 'banner', 'brand',
        'design_system', 'mcp', 'bot',
      ] as const

      for (const cat of categories) {
        const est = await creditService.estimateTask('test', cat)
        expect(est.min, `${cat}: min > 0`).toBeGreaterThan(0)
        expect(est.max, `${cat}: max >= min`).toBeGreaterThanOrEqual(est.min)
      }
    })
  })
})
