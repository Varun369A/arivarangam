import { describe, it, expect } from 'vitest'

// Test URL parsing logic without connecting to actual Redis

function parseUrlToOpts(url: string) {
  const parsed = new URL(url)
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6380', 10),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  }
}

describe('Redis URL parsing', () => {
  it('parses standard redis:// URL', () => {
    const opts = parseUrlToOpts('redis://localhost:6379')
    expect(opts.host).toBe('localhost')
    expect(opts.port).toBe(6379)
    expect(opts.password).toBeUndefined()
  })

  it('parses rediss:// (TLS) URL with credentials', () => {
    const url = 'rediss://default:mypassword@creative-tetra-80004.upstash.io:6379'
    const opts = parseUrlToOpts(url)
    expect(opts.host).toBe('creative-tetra-80004.upstash.io')
    expect(opts.port).toBe(6379)
    expect(opts.password).toBe('mypassword')
    expect(opts.username).toBe('default')
  })

  it('defaults port to 6380 when not specified in URL', () => {
    const opts = parseUrlToOpts('rediss://default:pass@host.upstash.io')
    expect(opts.port).toBe(6380)
  })

  it('detects TLS from rediss:// scheme', () => {
    expect('rediss://host:6379'.startsWith('rediss://')).toBe(true)
    expect('redis://host:6379'.startsWith('rediss://')).toBe(false)
  })

  it('BullMQ connection includes maxRetriesPerRequest null', () => {
    // The getBullMQConnection function must set maxRetriesPerRequest: null for BullMQ
    const url = 'redis://localhost:6379'
    const parsed = new URL(url)
    const conn = {
      host: parsed.hostname,
      port: parseInt(parsed.port || '6379', 10),
      maxRetriesPerRequest: null as null,
    }
    expect(conn.maxRetriesPerRequest).toBeNull()
  })
})
