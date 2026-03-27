import Redis from 'ioredis';
import { getConfig } from '@arivarangam/config';

// ─── Redis URL Parser ─────────────────────────────────────────────────────────
// Handles both local Redis (redis://) and Upstash (rediss:// TLS)

function parseRedisOptions(url: string): ConstructorParameters<typeof Redis>[0] {
  // If it's a full URL string, ioredis can parse it directly
  // but we need to add TLS options for Upstash (rediss://)
  const isTLS = url.startsWith('rediss://');

  if (isTLS) {
    // For Upstash: ioredis accepts the URL but needs tls config
    return {
      ...parseUrlToOpts(url),
      tls: { rejectUnauthorized: false },
    };
  }

  return url; // Local Redis — pass URL string directly
}

function parseUrlToOpts(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || '6380', 10),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
  };
}

// ─── Shared Client (pub/sub publisher, general queries) ───────────────────────

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const config = getConfig();
    const opts = parseRedisOptions(config.REDIS_URL);

    _redis = typeof opts === 'string'
      ? new Redis(opts, { maxRetriesPerRequest: 3, enableReadyCheck: true, lazyConnect: false })
      : new Redis({ ...opts, maxRetriesPerRequest: 3, enableReadyCheck: false, lazyConnect: false });

    _redis.on('error', (err) => console.error('[Redis] Connection error:', err.message));
    _redis.on('connect', () => console.log('[Redis] Connected'));
    _redis.on('reconnecting', () => console.log('[Redis] Reconnecting...'));
  }
  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}

// ─── Subscriber Client ────────────────────────────────────────────────────────
// Redis pub/sub requires a dedicated connection (cannot share with regular commands)

export function createSubscriber(): Redis {
  const config = getConfig();
  const opts = parseRedisOptions(config.REDIS_URL);

  return typeof opts === 'string'
    ? new Redis(opts, { maxRetriesPerRequest: 3, enableReadyCheck: false })
    : new Redis({ ...opts, maxRetriesPerRequest: 3, enableReadyCheck: false });
}

// ─── BullMQ Connection Helper ─────────────────────────────────────────────────
// BullMQ requires maxRetriesPerRequest: null (different from normal ioredis)
// Export this for use in taskQueue.ts and worker.ts

export function getBullMQConnection() {
  const config = getConfig();
  const url = config.REDIS_URL;
  const isTLS = url.startsWith('rediss://');
  const parsed = new URL(url.startsWith('redis') ? url : `redis://${url}`);

  return {
    host: parsed.hostname,
    port: parseInt(parsed.port || (isTLS ? '6380' : '6379'), 10),
    password: parsed.password || undefined,
    username: parsed.username || undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
    ...(isTLS ? { tls: { rejectUnauthorized: false } } : {}),
  };
}

// ─── Key Helpers ──────────────────────────────────────────────────────────────

export const TASK_CHANNEL = (taskId: string) => `task:events:${taskId}`;
export const TASK_LOCK = (taskId: string) => `task:lock:${taskId}`;
export const PURCHASE_RATE_KEY = (userId: string) => `purchase:user:${userId}`;
export const PURCHASE_IP_KEY = (ip: string) => `purchase:ip:${ip}`;
