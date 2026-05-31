import NodeCache from 'node-cache';
import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { logger } from '../utils/logger';

// Initialize the cache with a default TTL from environment variables
const cache = new NodeCache({ stdTTL: env.CACHE_TTL_SECONDS });

/**
 * Middleware for caching GET requests.
 * Caches responses based on URL for a specified TTL.
 */
export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET') {
    logger.debug(`Non-GET request, skipping cache: ${req.method} ${req.originalUrl}`);
    return next();
  }

  const key = req.originalUrl;
  const cachedResponse = cache.get(key);

  if (cachedResponse) {
    logger.debug(`Cache hit for key: ${key}`);
    return res.send(cachedResponse);
  } else {
    logger.debug(`Cache miss for key: ${key}`);
    // Monkey patch the response.send method to cache the response
    const originalSend = res.send;
    res.send = (body: any) => {
      cache.set(key, body); // Cache the response body
      logger.debug(`Cached response for key: ${key}`);
      return originalSend.call(res, body);
    };
    next();
  }
};

/**
 * Utility function to clear cache entries that match a pattern.
 * Useful after write operations (POST, PUT, DELETE) to ensure data freshness.
 * @param pattern A string or RegExp to match cache keys.
 */
export function clearCache(pattern: string | RegExp) {
  const keys = cache.keys();
  const keysToDelete = keys.filter(key => key.match(pattern));
  if (keysToDelete.length > 0) {
    cache.del(keysToDelete);
    logger.info(`Cleared cache entries matching pattern: ${pattern}. Keys: ${keysToDelete.join(', ')}`);
  } else {
    logger.debug(`No cache entries found for pattern: ${pattern}`);
  }
}
```