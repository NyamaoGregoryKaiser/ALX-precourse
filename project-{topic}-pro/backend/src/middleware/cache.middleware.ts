```typescript
import { Request, Response, NextFunction } from 'express';
import redisClient from '@config/redis';
import logger from '@config/logger';

const DEFAULT_EXPIRATION = 3600; // 1 hour

export const cache = (keyPrefix: string, expiration = DEFAULT_EXPIRATION) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = `${keyPrefix}:${req.originalUrl}`; // Unique key per URL

    try {
      const cachedData = await redisClient.get(key);
      if (cachedData) {
        logger.debug(`Cache hit for key: ${key}`);
        return res.status(200).json(JSON.parse(cachedData));
      }
      logger.debug(`Cache miss for key: ${key}`);
      // If not cached, continue to route handler and then cache the response
      const originalSend = res.send;
      res.send = (body: any) => {
        redisClient.setEx(key, expiration, body).catch(err => {
          logger.error(`Error caching data for key ${key}: ${err}`);
        });
        originalSend.call(res, body);
        return res; // Return res for chaining
      };
      next();
    } catch (error) {
      logger.error(`Redis cache error: ${error instanceof Error ? error.message : error}`);
      next(); // Continue to route handler even if cache fails
    }
  };
};

export const clearCache = async (keyPrefix: string) => {
  try {
    const keys = await redisClient.keys(`${keyPrefix}:*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
      logger.info(`Cleared cache for prefix: ${keyPrefix}`);
    }
  } catch (error) {
    logger.error(`Error clearing cache for prefix ${keyPrefix}: ${error instanceof Error ? error.message : error}`);
  }
};
```