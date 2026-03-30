import { Request, Response, NextFunction } from 'express';
import { getCacheManager } from '../config/cache';
import logger from '../config/logger';

export const cacheMiddleware = (keyPrefix: string, ttlSeconds?: number) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const cacheKey = `${keyPrefix}:${req.originalUrl}`;
    const cache = getCacheManager();

    try {
      const cachedResponse = await cache.get(cacheKey);

      if (cachedResponse) {
        logger.debug(`Cache hit for ${cacheKey}`);
        return res.status(200).json(cachedResponse);
      }

      // If not cached, proceed with the request and cache the response
      const originalSend = res.send;
      res.send = (body) => {
        // Only cache successful JSON responses
        if (res.statusCode === 200 && typeof body === 'string' && res.get('Content-Type')?.includes('application/json')) {
          cache.set(cacheKey, JSON.parse(body), { ttl: (ttlSeconds || getCacheManager().store.ttl) * 1000 }).catch(error => {
            logger.error(`Failed to cache response for ${cacheKey}:`, error);
          });
          logger.debug(`Cached response for ${cacheKey}`);
        }
        return originalSend.apply(res, [body]);
      };
      next();
    } catch (error) {
      logger.error(`Cache error for ${cacheKey}:`, error);
      next(); // Proceed without caching if there's a cache error
    }
  };
};

export const clearCache = async (keyPrefix: string | string[]) => {
  const cache = getCacheManager();
  const prefixes = Array.isArray(keyPrefix) ? keyPrefix : [keyPrefix];

  try {
    for (const prefix of prefixes) {
      // This is a simplistic approach. For Redis, you'd use SCAN or KEYS pattern.
      // For cache-manager, `store.keys()` gives all keys. Be cautious with large caches.
      if (cache.store.name === 'redis') {
        const redisClient = (cache.store as any).client; // Direct access to redis client
        const keys = await redisClient.keys(`${prefix}:*`);
        if (keys.length > 0) {
          await redisClient.del(keys);
          logger.info(`Cleared ${keys.length} keys for prefix ${prefix} from Redis cache.`);
        }
      } else { // Memory store
        const allKeys = await cache.store.keys();
        const keysToDelete = allKeys.filter(key => key.startsWith(`${prefix}:`));
        for (const key of keysToDelete) {
          await cache.del(key);
        }
        logger.info(`Cleared ${keysToDelete.length} keys for prefix ${prefix} from memory cache.`);
      }
    }
  } catch (error) {
    logger.error(`Error clearing cache for prefix(es) ${prefixes.join(', ')}:`, error);
  }
};
```

#### `backend/src/utils/ApiError.ts` (Custom error class)
```typescript