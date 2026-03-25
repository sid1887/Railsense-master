/**
 * Redis Connection Manager
 * Handles all Redis operations with connection pooling and error handling
 */

import Redis from 'ioredis';

let redis: Redis | null = null;
let nextConnectAttemptAt = 0;

const REDIS_RETRY_LIMIT = Number(process.env.REDIS_RETRY_LIMIT || 3);
const REDIS_RETRY_COOLDOWN_MS = Number(process.env.REDIS_RETRY_COOLDOWN_MS || 60000);
const REDIS_LOG_THROTTLE_MS = Number(process.env.REDIS_LOG_THROTTLE_MS || 20000);
const REDIS_VERBOSE_LOGS = process.env.REDIS_VERBOSE_LOGS === 'true';
const redisLogTimestamps = new Map<string, number>();

function shouldLogRedisEvent(eventKey: string): boolean {
  const now = Date.now();
  const last = redisLogTimestamps.get(eventKey) || 0;
  if (now - last < REDIS_LOG_THROTTLE_MS) {
    return false;
  }
  redisLogTimestamps.set(eventKey, now);
  return true;
}

function formatRedisError(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === 'string' && error.trim()) {
    return error;
  }
  return 'unknown redis error';
}

const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT || 6379),
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB || 0),
  retryStrategy: (times: number) => {
    if (times > REDIS_RETRY_LIMIT) {
      return null; // Stop reconnect loop after bounded retries.
    }
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  enableReadyCheck: false,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,
  lazyConnect: true // Don't auto-connect until explicitly called
};

/**
 * Get or create Redis connection
 */
export async function getRedisClient(): Promise<Redis> {
  if (redis) {
    return redis;
  }

  if (Date.now() < nextConnectAttemptAt) {
    throw new Error('redis temporarily disabled');
  }

  redis = new Redis(REDIS_CONFIG);

  redis.on('error', (err) => {
    if (REDIS_VERBOSE_LOGS && shouldLogRedisEvent('error')) {
      console.warn('[Redis] Connection error:', formatRedisError(err));
    }
  });

  redis.on('connect', () => {
    nextConnectAttemptAt = 0;
    console.log('[Redis] Connected successfully');
  });

  redis.on('reconnecting', () => {
    if (REDIS_VERBOSE_LOGS && shouldLogRedisEvent('reconnecting')) {
      console.warn('[Redis] Reconnecting...');
    }
  });

  redis.on('end', () => {
    if (REDIS_VERBOSE_LOGS && shouldLogRedisEvent('end')) {
      console.warn('[Redis] Connection closed');
    }
  });

  // Attempt initial connection
  try {
    await redis.connect();
    console.log('[Redis] Initial connection established');
  } catch (error) {
    nextConnectAttemptAt = Date.now() + REDIS_RETRY_COOLDOWN_MS;
    if (shouldLogRedisEvent('initial-fail')) {
      console.warn('[Redis] Initial connection failed, using in-memory fallback:', formatRedisError(error));
    }

    try {
      redis.disconnect();
    } catch {
      // no-op
    }
    redis = null;
    throw error;
  }

  return redis;
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  if (Date.now() < nextConnectAttemptAt) {
    return false;
  }

  try {
    const client = await getRedisClient();
    if (client.status === 'ready') {
      return true;
    }
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    nextConnectAttemptAt = Date.now() + REDIS_RETRY_COOLDOWN_MS;
    return false;
  }
}

/**
 * Get a value from Redis
 */
export async function redisGet(key: string): Promise<string | null> {
  try {
    const client = await getRedisClient();
    return await client.get(key);
  } catch (error) {
    console.error('[Redis] Get error for key', key, ':', error);
    return null;
  }
}

/**
 * Get a JSON value from Redis
 */
export async function redisGetJson<T>(key: string): Promise<T | null> {
  try {
    const data = await redisGet(key);
    if (!data) return null;
    return JSON.parse(data);
  } catch (error) {
    console.error('[Redis] Get JSON error for key', key, ':', error);
    return null;
  }
}

/**
 * Set a value in Redis with optional expiry
 */
export async function redisSet(key: string, value: string, expirySeconds?: number): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (expirySeconds) {
      await client.setex(key, expirySeconds, value);
    } else {
      await client.set(key, value);
    }
    return true;
  } catch (error) {
    console.error('[Redis] Set error for key', key, ':', error);
    return false;
  }
}

/**
 * Set a JSON value in Redis with optional expiry
 */
export async function redisSetJson<T>(key: string, value: T, expirySeconds?: number): Promise<boolean> {
  try {
    const jsonString = JSON.stringify(value);
    return await redisSet(key, jsonString, expirySeconds);
  } catch (error) {
    console.error('[Redis] Set JSON error for key', key, ':', error);
    return false;
  }
}

/**
 * Delete a key from Redis
 */
export async function redisDelete(key: string): Promise<number> {
  try {
    const client = await getRedisClient();
    return await client.del(key);
  } catch (error) {
    console.error('[Redis] Delete error for key', key, ':', error);
    return 0;
  }
}

/**
 * Delete multiple keys from Redis
 */
export async function redisDeleteMultiple(keys: string[]): Promise<number> {
  try {
    const client = await getRedisClient();
    if (keys.length === 0) return 0;
    return await client.del(...keys);
  } catch (error) {
    console.error('[Redis] Delete multiple error:', error);
    return 0;
  }
}

/**
 * Check if a key exists
 */
export async function redisExists(key: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  } catch (error) {
    console.error('[Redis] Exists error for key', key, ':', error);
    return false;
  }
}

/**
 * Increment a counter in Redis
 */
export async function redisIncrement(key: string, increment: number = 1): Promise<number> {
  try {
    const client = await getRedisClient();
    return await client.incrby(key, increment);
  } catch (error) {
    console.error('[Redis] Increment error for key', key, ':', error);
    return 0;
  }
}

/**
 * Set expiry on an existing key
 */
export async function redisExpire(key: string, seconds: number): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const result = await client.expire(key, seconds);
    return result === 1;
  } catch (error) {
    console.error('[Redis] Expire error for key', key, ':', error);
    return false;
  }
}

/**
 * Get all keys matching a pattern
 */
export async function redisGetKeys(pattern: string): Promise<string[]> {
  try {
    const client = await getRedisClient();
    return await client.keys(pattern);
  } catch (error) {
    console.error('[Redis] Get keys error for pattern', pattern, ':', error);
    return [];
  }
}

/**
 * Clear all keys matching a pattern
 */
export async function redisClearPattern(pattern: string): Promise<number> {
  try {
    const keys = await redisGetKeys(pattern);
    if (keys.length === 0) return 0;
    return await redisDeleteMultiple(keys);
  } catch (error) {
    console.error('[Redis] Clear pattern error for pattern', pattern, ':', error);
    return 0;
  }
}

/**
 * Flush entire database
 */
export async function redisFlushDb(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    await client.flushdb();
    console.log('[Redis] Database flushed');
    return true;
  } catch (error) {
    console.error('[Redis] Flush error:', error);
    return false;
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit();
      console.log('[Redis] Connection closed');
      redis = null;
    } catch (error) {
      console.error('[Redis] Close error:', error);
    }
  }
}

/**
 * Get Redis connection info
 */
export async function getRedisInfo(): Promise<{ status: string; available: boolean; connectedClients?: number }> {
  try {
    if (!(await isRedisAvailable())) {
      return { status: 'unavailable', available: false };
    }
    const client = await getRedisClient();
    const info = await client.info('server');
    const connectedClients = await client.dbsize();
    return {
      status: 'connected',
      available: true,
      connectedClients
    };
  } catch (error) {
    return { status: 'error', available: false };
  }
}
