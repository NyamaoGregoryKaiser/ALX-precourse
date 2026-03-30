import { caching, MemoryCache, Cache } from 'cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import config from './index';
import logger from './logger';

let cacheManager: Cache;

export const initCache = async () => {
  if (config.cache.store === 'redis' && config.cache.host && config.cache.port) {
    try {
      cacheManager = await caching(redisStore, {
        socket: {
          host: config.cache.host,
          port: config.cache.port,
        },
        ttl: config.cache.ttl * 1000, // Convert to ms
      });
      logger.info(`Redis cache initialized on ${config.cache.host}:${config.cache.port}`);
    } catch (error) {
      logger.error('Failed to initialize Redis cache, falling back to in-memory:', error);
      cacheManager = await caching('memory', {
        ttl: config.cache.ttl * 1000,
        max: config.cache.max,
      });
    }
  } else {
    cacheManager = await caching('memory', {
      ttl: config.cache.ttl * 1000,
      max: config.cache.max,
    });
    logger.info('In-memory cache initialized.');
  }
};

export const getCacheManager = (): Cache => {
  if (!cacheManager) {
    throw new Error('Cache manager not initialized. Call initCache() first.');
  }
  return cacheManager;
};
```

#### `backend/src/entities/BaseEntity.ts` (Abstract base entity for common fields)
```typescript