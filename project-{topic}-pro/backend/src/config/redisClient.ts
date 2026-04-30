```typescript
import Redis from 'ioredis';
import { config } from './index';
import { logger } from '../utils/logger';

const redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    password: process.env.REDIS_PASSWORD || undefined, // Only if Redis requires auth
});

redisClient.on('connect', () => {
    logger.info('Redis connected successfully!');
});

redisClient.on('error', (err) => {
    logger.error('Redis connection error:', err);
});

export default redisClient;
```