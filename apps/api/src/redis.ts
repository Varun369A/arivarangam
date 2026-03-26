import Redis from 'ioredis';
import { getConfig } from '@arivarangam/config';

let _redis: Redis | null = null;

export function getRedis(): Redis {
  if (!_redis) {
    const config = getConfig();
    _redis = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    _redis.on('error', (err) => {
      console.error('[Redis] Connection error:', err.message);
    });

    _redis.on('connect', () => {
      console.log('[Redis] Connected');
    });

    _redis.on('reconnecting', () => {
      console.log('[Redis] Reconnecting...');
    });
  }
  return _redis;
}

export async function closeRedis(): Promise<void> {
  if (_redis) {
    await _redis.quit();
    _redis = null;
  }
}

// Create a separate subscriber client (Redis pub/sub requires dedicated connections)
export function createSubscriber(): Redis {
  const config = getConfig();
  return new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: 3,
  });
}

export const TASK_CHANNEL = (taskId: string) => `task:events:${taskId}`;
export const TASK_LOCK = (taskId: string) => `task:lock:${taskId}`;
export const PURCHASE_RATE_KEY = (userId: string) => `purchase:user:${userId}`;
export const PURCHASE_IP_KEY = (ip: string) => `purchase:ip:${ip}`;
