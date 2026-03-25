/**
 * Caching Service
 * High-level caching abstraction using Redis with fallback to in-memory
 * Automatically handles serialization, TTL, and cache invalidation
 */

import {
  redisSet, redisGet, redisDelete, redisSetJson, redisGetJson,
  redisClearPattern, isRedisAvailable, redisIncrement, redisExpire
} from '@/lib/redis';

// In-memory cache fallback when Redis is unavailable
const memoryCache = new Map<string, { value: any; expiresAt?: number }>();

export interface CacheConfig {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Cache key prefix
  fallbackToMemory?: boolean; // Use memory cache if Redis fails
}

const DEFAULT_CONFIG: Required<CacheConfig> = {
  ttl: 3600, // 1 hour default
  namespace: 'railsense',
  fallbackToMemory: true
};

/**
 * Get a cache key with namespace
 */
function getCacheKey(key: string, namespace?: string): string {
  const ns = namespace || DEFAULT_CONFIG.namespace;
  return `${ns}:${key}`;
}

/**
 * Cache a value
 */
export async function setCache<T>(
  key: string,
  value: T,
  config: CacheConfig = {}
): Promise<boolean> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const cacheKey = getCacheKey(key, finalConfig.namespace);

  try {
    const isRedisAvail = await isRedisAvailable();

    if (isRedisAvail) {
      return await redisSetJson(cacheKey, value, finalConfig.ttl);
    } else if (finalConfig.fallbackToMemory) {
      const expiresAt = finalConfig.ttl ? Date.now() + finalConfig.ttl * 1000 : undefined;
      memoryCache.set(cacheKey, { value, expiresAt });
      return true;
    }
    return false;
  } catch (error) {
    console.error('[Cache] Set error for key', cacheKey, ':', error);
    if (finalConfig.fallbackToMemory) {
      const expiresAt = finalConfig.ttl ? Date.now() + finalConfig.ttl * 1000 : undefined;
      memoryCache.set(cacheKey, { value, expiresAt });
      return true;
    }
    return false;
  }
}

/**
 * Get a cached value
 */
export async function getCache<T>(
  key: string,
  config: CacheConfig = {}
): Promise<T | null> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const cacheKey = getCacheKey(key, finalConfig.namespace);

  try {
    const isRedisAvail = await isRedisAvailable();

    if (isRedisAvail) {
      return await redisGetJson<T>(cacheKey);
    } else {
      // Try memory cache
      const cached = memoryCache.get(cacheKey);
      if (!cached) return null;

      if (cached.expiresAt && Date.now() > cached.expiresAt) {
        memoryCache.delete(cacheKey);
        return null;
      }
      return cached.value;
    }
  } catch (error) {
    console.error('[Cache] Get error for key', cacheKey, ':', error);
    return null;
  }
}

/**
 * Delete a cached value
 */
export async function deleteCache(
  key: string,
  namespace?: string
): Promise<boolean> {
  const cacheKey = getCacheKey(key, namespace);

  try {
    const isRedisAvail = await isRedisAvailable();

    if (isRedisAvail) {
      await redisDelete(cacheKey);
    }

    memoryCache.delete(cacheKey);
    return true;
  } catch (error) {
    console.error('[Cache] Delete error for key', cacheKey, ':', error);
    return false;
  }
}

/**
 * Clear all cache entries matching a pattern
 */
export async function clearCachePattern(
  pattern: string,
  namespace?: string
): Promise<number> {
  const ns = namespace || DEFAULT_CONFIG.namespace;
  const fullPattern = `${ns}:${pattern}`;

  try {
    const isRedisAvail = await isRedisAvailable();
    let deletedCount = 0;

    if (isRedisAvail) {
      deletedCount = await redisClearPattern(fullPattern);
    }

    // Clear matching memory cache entries
    for (const [key] of memoryCache.entries()) {
      if (key.startsWith(fullPattern.replace('*', ''))) {
        memoryCache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  } catch (error) {
    console.error('[Cache] Clear pattern error:', error);
    return 0;
  }
}

/**
 * Cache-aside (get with callback)
 * If key exists, return cached value
 * Otherwise, call function, cache result, and return
 */
export async function getCacheOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  config: CacheConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // Try to get from cache first
  const cached = await getCache<T>(key, config);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch and cache
  try {
    const value = await fetchFn();
    await setCache(key, value, finalConfig);
    return value;
  } catch (error) {
    console.error('[Cache] Fetch error for key', key, ':', error);
    throw error;
  }
}

/**
 * Train-specific cache functions
 */
export const trainCache = {
  /**
   * Cache train position data
   */
  async setPosition(trainNumber: string, data: any, ttl: number = 300): Promise<boolean> {
    return setCache(`train:${trainNumber}:position`, data, { ttl, namespace: 'railsense' });
  },

  /**
   * Get cached train position
   */
  async getPosition(trainNumber: string): Promise<any | null> {
    return getCache(`train:${trainNumber}:position`, { namespace: 'railsense' });
  },

  /**
   * Cache train route data (longer TTL - doesn't change often)
   */
  async setRoute(trainNumber: string, data: any, ttl: number = 86400): Promise<boolean> {
    return setCache(`train:${trainNumber}:route`, data, { ttl, namespace: 'railsense' });
  },

  /**
   * Get cached train route
   */
  async getRoute(trainNumber: string): Promise<any | null> {
    return getCache(`train:${trainNumber}:route`, { namespace: 'railsense' });
  },

  /**
   * Cache train predictions
   */
  async setPredictions(trainNumber: string, data: any, ttl: number = 600): Promise<boolean> {
    return setCache(`train:${trainNumber}:predictions`, data, { ttl, namespace: 'railsense' });
  },

  /**
   * Get cached predictions
   */
  async getPredictions(trainNumber: string): Promise<any | null> {
    return getCache(`train:${trainNumber}:predictions`, { namespace: 'railsense' });
  },

  /**
   * Invalidate all train caches
   */
  async invalidateAll(trainNumber: string): Promise<number> {
    return clearCachePattern(`train:${trainNumber}:*`, 'railsense');
  }
};

/**
 * Session cache functions
 */
export const sessionCache = {
  /**
   * Store user session
   */
  async create(sessionId: string, userId: number, data: any, ttl: number = 86400): Promise<boolean> {
    return setCache(`session:${sessionId}`, { userId, ...data }, { ttl, namespace: 'railsense' });
  },

  /**
   * Get user session
   */
  async get(sessionId: string): Promise<any | null> {
    return getCache(`session:${sessionId}`, { namespace: 'railsense' });
  },

  /**
   * Delete session
   */
  async delete(sessionId: string): Promise<boolean> {
    return deleteCache(`session:${sessionId}`, 'railsense');
  }
};

/**
 * Rate limit cache functions
 */
export const rateLimitCache = {
  /**
   * Get current rate limit count
   */
  async getCount(key: string): Promise<number> {
    const cached = await getCache<number>(key, { namespace: 'ratelimit' });
    return cached || 0;
  },

  /**
   * Increment rate limit counter
   */
  async increment(key: string, ttl: number = 60): Promise<number> {
    const isRedisAvail = await isRedisAvailable();

    if (isRedisAvail) {
      const count = await redisIncrement(`ratelimit:${key}`);
      await redisExpire(`ratelimit:${key}`, ttl);
      return count;
    } else {
      // In-memory fallback
      const cacheKey = getCacheKey(key, 'ratelimit');
      const cached = memoryCache.get(cacheKey);
      let count = cached ? cached.value + 1 : 1;
      const expiresAt = Date.now() + ttl * 1000;
      memoryCache.set(cacheKey, { value: count, expiresAt });
      return count;
    }
  }
};

/**
 * Clean up expired memory cache entries periodically
 */
export function startMemoryCacheCleanup(intervalSeconds: number = 300): NodeJS.Timer {
  return setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of memoryCache.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => memoryCache.delete(key));

    if (keysToDelete.length > 0) {
      console.log('[Cache] Cleaned up', keysToDelete.length, 'expired memory cache entries');
    }
  }, intervalSeconds * 1000);
}

// Start automatic cleanup every 5 minutes
startMemoryCacheCleanup(300);
