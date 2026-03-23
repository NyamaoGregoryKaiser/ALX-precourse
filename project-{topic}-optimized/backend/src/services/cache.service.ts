```typescript
import { createClient } from 'redis';
import { REDIS_HOST, REDIS_PORT } from '../config/constants';
import { logger } from './logger.service';

// Initialize Redis Client
export const redisClient = createClient({
    url: `redis://${REDIS_HOST}:${REDIS_PORT}`
});

redisClient.on('error', err => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis client connected.'));
redisClient.on('ready', () => logger.info('Redis client ready.'));

class CacheService {
    public async set(key: string, value: string, expiresInSeconds: number = 3600): Promise<void> {
        await redisClient.setEx(key, expiresInSeconds, value);
    }

    public async get(key: string): Promise<string | null> {
        return await redisClient.get(key);
    }

    public async delete(key: string): Promise<number> {
        return await redisClient.del(key);
    }

    public async clearCache(): Promise<string> {
        return await redisClient.flushAll();
    }
}

export const cacheService = new CacheService();
```