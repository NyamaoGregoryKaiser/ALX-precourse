```typescript
import { caching, CacheStore } from 'cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import config from '../config';
import logger from './logger';

let redisCache: CacheStore;

async function initializeCache() {
  if (config.env === 'test') {
    // Use a no-op cache for testing
    redisCache = {
      get: async () => undefined,
      set: async () => {},
      del: async () => {},
      reset: async () => {},
      wrap: async (key, fn) => fn(),
    };
    logger.warn('Cache initialized with no-op store for testing environment.');
    return;
  }

  try {
    redisCache = await caching({
      store: redisStore,
      host: config.redis.host,
      port: config.redis.port,
      ttl: 3600, // default cache TTL in seconds (1 hour)
    });

    redisCache.store.events.on('connect', () => logger.info('Redis cache connected.'));
    redisCache.store.events.on('error', (error: any) => logger.error('Redis cache error:', error));

    logger.info(`Redis cache initialized on ${config.redis.host}:${config.redis.port}`);
  } catch (error) {
    logger.error('Failed to initialize Redis cache:', error);
    // Fallback to in-memory cache if Redis fails
    redisCache = await caching({
      store: 'memory',
      ttl: 3600,
    });
    logger.warn('Falling back to in-memory cache due to Redis connection failure.');
  }
}

const cache = {
  get: async <T>(key: string): Promise<T | undefined> => {
    return redisCache.get(key);
  },
  set: async <T>(key: string, value: T, ttl?: number): Promise<void> => {
    await redisCache.set(key, value, ttl);
  },
  del: async (key: string): Promise<void> => {
    await redisCache.del(key);
  },
  wrap: async <T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> => {
    return redisCache.wrap(key, fn, ttl);
  },
  reset: async (): Promise<void> => {
    await redisCache.reset();
  },
};

export { initializeCache, cache };
```