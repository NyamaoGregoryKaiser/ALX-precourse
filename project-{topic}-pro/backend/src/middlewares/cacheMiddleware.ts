```typescript
import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redisClient';
import { config } from '../config';
import { logger } from '../utils/logger';

// A simple in-memory cache for tracking if a route is already being processed for caching
const cacheInFlight = new Map<string, Promise<any>>();

export const cacheMiddleware = (keyPrefix: string, expirationSeconds: number = config.redis.cacheTTLSeconds) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (req.method !== 'GET') {
            return next();
        }

        const cacheKey = `${keyPrefix}:${req.userId || 'guest'}:${req.originalUrl}`;

        // Check if a request for this key is already in flight
        if (cacheInFlight.has(cacheKey)) {
            logger.debug(`Cache in flight for key: ${cacheKey}`);
            try {
                const data = await cacheInFlight.get(cacheKey);
                if (data) {
                    logger.info(`[CACHE] Served from in-flight for key: ${cacheKey}`);
                    return res.status(200).json(JSON.parse(data));
                }
            } catch (error) {
                logger.error(`Error resolving in-flight cache for ${cacheKey}:`, error);
                // Fallback to next() if in-flight cache fails
            }
        }

        try {
            const cachedData = await redisClient.get(cacheKey);

            if (cachedData) {
                logger.info(`[CACHE] Cache hit for key: ${cacheKey}`);
                return res.status(200).json(JSON.parse(cachedData));
            }

            logger.info(`[CACHE] Cache miss for key: ${cacheKey}`);

            // If not cached, prepare to capture response
            const originalSend = res.send;
            let responseBody: any;

            const captureSend = (body: any) => {
                responseBody = body;
                return originalSend.call(res, body);
            };

            res.send = captureSend;

            // Create a promise to handle caching once the request is processed
            const cachePromise = new Promise<string | null>((resolve, reject) => {
                res.on('finish', async () => {
                    if (res.statusCode >= 200 && res.statusCode < 300 && responseBody) {
                        try {
                            const dataToCache = typeof responseBody === 'string' ? responseBody : JSON.stringify(responseBody);
                            await redisClient.setex(cacheKey, expirationSeconds, dataToCache);
                            logger.info(`[CACHE] Data cached for key: ${cacheKey}`);
                            resolve(dataToCache);
                        } catch (cacheError) {
                            logger.error(`[CACHE] Error setting cache for key ${cacheKey}:`, cacheError);
                            reject(cacheError);
                        }
                    } else {
                        resolve(null); // Do not cache non-2xx responses
                    }
                    cacheInFlight.delete(cacheKey); // Remove from in-flight regardless of outcome
                });
                res.on('error', (err) => {
                    cacheInFlight.delete(cacheKey);
                    reject(err);
                });
            });

            cacheInFlight.set(cacheKey, cachePromise);
            next(); // Continue to route handler
        } catch (error) {
            logger.error(`[CACHE] Error in cache middleware for key ${cacheKey}:`, error);
            cacheInFlight.delete(cacheKey); // Ensure cleanup
            next(); // Continue without caching
        }
    };
};

export const invalidateCache = async (keyPattern: string) => {
    try {
        const keys = await redisClient.keys(keyPattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
            logger.info(`[CACHE] Invalidated cache keys matching pattern: ${keyPattern} (count: ${keys.length})`);
        }
    } catch (error) {
        logger.error(`[CACHE] Error invalidating cache for pattern ${keyPattern}:`, error);
    }
};
```