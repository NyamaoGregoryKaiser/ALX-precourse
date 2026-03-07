```typescript
import { Request, Response, NextFunction } from 'express';
import config from '../config';
import logger from '../config/logger';

// In-memory cache for demonstration purposes.
// For production, consider using Redis or another distributed cache.
interface CacheEntry {
  data: any;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

export const cacheMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const key = req.originalUrl;

  if (cache.has(key)) {
    const entry = cache.get(key)!;
    const now = Date.now();

    if (now - entry.timestamp < config.CACHE_TTL_SECONDS * 1000) {
      logger.debug(`Cache hit for ${key}`);
      return res.status(200).json({
        status: 'success',
        data: entry.data,
        cached: true,
      });
    } else {
      logger.debug(`Cache expired for ${key}`);
      cache.delete(key); // Entry expired
    }
  }

  // Monkey patch res.json to cache the response
  const originalJson = res.json;
  res.json = function(body?: any): Response {
    if (res.statusCode === 200 && body && body.status === 'success') { // Only cache successful responses
      logger.debug(`Caching response for ${key}`);
      cache.set(key, { data: body.data, timestamp: Date.now() });
    }
    return originalJson.call(this, body);
  };

  next();
};

export const clearCache = (req: Request, res: Response, next: NextFunction) => {
  const key = req.originalUrl;
  if (cache.has(key)) {
    cache.delete(key);
    logger.debug(`Cache cleared for ${key}`);
  }
  next();
}

export const clearAllCache = () => {
  cache.clear();
  logger.info('All cache cleared.');
}
```