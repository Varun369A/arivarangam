import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// ─── .env file format validation ("plugin check") ─────────────────────────────
// Validates all .env files for format correctness:
//  - No spaces around = sign for specific keys
//  - No duplicate keys
//  - All required API keys are non-empty

const REQUIRED_KEYS = [
  'DATABASE_URL', 'JWT_SECRET', 'ANTHROPIC_API_KEY',
  'OPENAI_API_KEY', 'PERPLEXITY_API_KEY',
  'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY',
  'RESEND_API_KEY',
]

function parseEnvFile(content: string): Map<string, string> {
  const map = new Map<string, string>()
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const val = trimmed.slice(idx + 1).trim().replace(/^"(.*)"$/, '$1')
    map.set(key, val)
  }
  return map
}

// __dirname is apps/api/src/__tests__ — go up to apps/api
const API_ENV  = resolve(__dirname, '../../.env')
const WRKR_ENV = resolve(__dirname, '../../../worker/.env')

describe('.env file validation (plugin check)', () => {
  describe('apps/api/.env', () => {
    it('file exists', () => {
      expect(existsSync(API_ENV), `Expected ${API_ENV} to exist`).toBe(true)
    })

    const content = existsSync(API_ENV) ? readFileSync(API_ENV, 'utf-8') : ''
    const env = parseEnvFile(content)

    it('file has entries', () => {
      expect(env.size).toBeGreaterThan(0)
    })

    for (const key of REQUIRED_KEYS) {
      it(`required key ${key} is present and non-empty`, () => {
        const val = env.get(key)
        expect(val, `${key} must be set`).toBeTruthy()
        expect(val!.length).toBeGreaterThan(0)
      })
    }

    it('has no duplicate keys', () => {
      const keys = content.split('\n')
        .filter(l => l.trim() && !l.trim().startsWith('#') && l.includes('='))
        .map(l => l.slice(0, l.indexOf('=')).trim())
      expect(keys.length).toBe(new Set(keys).size)
    })

    it('RESEND_FROM has no space before = sign', () => {
      expect(content).not.toMatch(/RESEND_FROM\s+=/)
    })

    it('JWT_SECRET is at least 32 characters', () => {
      expect((env.get('JWT_SECRET') ?? '').length).toBeGreaterThanOrEqual(32)
    })

    it('DATABASE_URL uses postgresql:// or postgres:// scheme', () => {
      expect(env.get('DATABASE_URL') ?? '').toMatch(/^postgresql:\/\/|^postgres:\/\//)
    })

    it('REDIS_URL uses redis:// or rediss:// scheme', () => {
      expect(env.get('REDIS_URL') ?? '').toMatch(/^redis:\/\/|^rediss:\/\//)
    })

    it('API_URL is set', () => {
      expect(env.get('API_URL')).toBeTruthy()
    })

    it('NODE_ENV is production', () => {
      expect(env.get('NODE_ENV')).toBe('production')
    })
  })

  describe('apps/worker/.env', () => {
    it('file exists', () => {
      expect(existsSync(WRKR_ENV), `Expected ${WRKR_ENV} to exist`).toBe(true)
    })

    const content = existsSync(WRKR_ENV) ? readFileSync(WRKR_ENV, 'utf-8') : ''
    const env = parseEnvFile(content)

    it('file has entries', () => {
      expect(env.size).toBeGreaterThan(0)
    })

    it('JWT_SECRET is set and matches api/.env', () => {
      const apiContent = existsSync(API_ENV) ? readFileSync(API_ENV, 'utf-8') : ''
      const apiEnv = parseEnvFile(apiContent)
      expect(env.get('JWT_SECRET')).toBeTruthy()
      expect(env.get('JWT_SECRET')).toBe(apiEnv.get('JWT_SECRET'))
    })

    it('DATABASE_URL is set', () => {
      expect(env.get('DATABASE_URL')).toBeTruthy()
    })

    it('ANTHROPIC_API_KEY is set', () => {
      expect(env.get('ANTHROPIC_API_KEY')).toBeTruthy()
    })
  })
})
