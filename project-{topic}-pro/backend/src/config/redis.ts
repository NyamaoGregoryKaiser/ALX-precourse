```typescript
import { createClient } from 'redis';
import { config } from './index';
import logger from './logger';

const redisClient = createClient({
  url: `redis://${config.REDIS_PASSWORD ? `:${config.REDIS_PASSWORD}@` : ''}${config.REDIS_HOST}:${config.REDIS_PORT}`
});

redisClient.on('connect', () => logger.info('Redis client connected!'));
redisClient.on('error', (err) => logger.error(`Redis client error: ${err}`));

export const connectRedis = async () => {
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }
};

export const disconnectRedis = async () => {
  if (redisClient.isOpen) {
    await redisClient.quit();
  }
};

export default redisClient;
```