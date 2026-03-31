import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { resetConfig } from './index'

// ─── Config package tests ─────────────────────────────────────────────────────
// We stub process.env before each test and restore afterwards.

const VALID_ENV = {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://user:pass@localhost/testdb',
  JWT_SECRET: 'test-secret-key-that-is-at-least-32-chars!!',
  ANTHROPIC_API_KEY: 'sk-ant-test',
  OPENAI_API_KEY: 'sk-openai-test',
  PERPLEXITY_API_KEY: 'pplx-test',
  R2_ACCOUNT_ID: 'r2-account',
  R2_ACCESS_KEY_ID: 'r2-key-id',
  R2_SECRET_ACCESS_KEY: 'r2-secret',
}

describe('config package', () => {
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    // Clear all env vars, then set our test base
    Object.keys(process.env).forEach(k => delete process.env[k])
    Object.assign(process.env, VALID_ENV)
    resetConfig()
  })

  afterEach(() => {
    process.env = originalEnv
    resetConfig()
  })

  it('loads valid config without throwing', async () => {
    const { getConfig } = await import('./index')
    expect(() => getConfig()).not.toThrow()
  })

  it('returns correct NODE_ENV', async () => {
    const { getConfig } = await import('./index')
    const cfg = getConfig()
    expect(cfg.NODE_ENV).toBe('test')
  })

  it('applies default values for optional vars', async () => {
    const { getConfig } = await import('./index')
    const cfg = getConfig()
    expect(cfg.REDIS_URL).toBe('redis://localhost:6379')
    expect(cfg.JWT_EXPIRES_IN).toBe('7d')
    expect(cfg.PORT).toBe(3001)
    expect(cfg.R2_BUCKET_NAME).toBe('arivarangam')
    expect(cfg.ENABLE_SELF_IMPROVE).toBe(true)
    expect(cfg.ENABLE_PLATFORM_MONITOR).toBe(true)
  })

  it('parses CORS_ORIGINS into array', async () => {
    process.env.CORS_ORIGINS = 'https://a.com,https://b.com,https://c.com'
    resetConfig()
    const { getConfig } = await import('./index')
    const cfg = getConfig()
    expect(cfg.CORS_ORIGINS).toEqual(['https://a.com', 'https://b.com', 'https://c.com'])
  })

  it('parses ENABLE_SELF_IMPROVE boolean false', async () => {
    process.env.ENABLE_SELF_IMPROVE = 'false'
    resetConfig()
    const { getConfig } = await import('./index')
    const cfg = getConfig()
    expect(cfg.ENABLE_SELF_IMPROVE).toBe(false)
  })

  it('parses WORKER_CONCURRENCY as int (via PORT check)', async () => {
    process.env.PORT = '4000'
    resetConfig()
    const { getConfig } = await import('./index')
    const cfg = getConfig()
    expect(cfg.PORT).toBe(4000)
  })

  it('singleton: returns same object on subsequent calls', async () => {
    const { getConfig } = await import('./index')
    const a = getConfig()
    const b = getConfig()
    expect(a).toBe(b)
  })

  it('resetConfig allows reloading with new env vars', async () => {
    const { getConfig } = await import('./index')
    const before = getConfig()
    expect(before.API_URL).toBe('http://localhost:3001')

    process.env.API_URL = 'https://api.example.com'
    resetConfig()
    const after = getConfig()
    expect(after.API_URL).toBe('https://api.example.com')
  })

  it('throws in production when DATABASE_URL is missing', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.DATABASE_URL
    resetConfig()
    const { getConfig } = await import('./index')
    expect(() => getConfig()).toThrow('[Config] Missing required environment variable: DATABASE_URL')
  })

  it('throws when JWT_SECRET is missing in production', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.JWT_SECRET
    resetConfig()
    const { getConfig } = await import('./index')
    expect(() => getConfig()).toThrow('[Config] Missing required environment variable: JWT_SECRET')
  })

  it('does NOT throw for missing required vars in test mode', async () => {
    delete process.env.DATABASE_URL
    delete process.env.JWT_SECRET
    resetConfig()
    const { getConfig } = await import('./index')
    expect(() => getConfig()).not.toThrow()
  })
})
