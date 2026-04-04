```typescript
import { createClient } from 'redis';
import { config } from '.';
import { logger } from './winston';

const redisClient = createClient({
  url: config.redisUrl,
});

redisClient.on('connect', () => logger.info('Redis client connected!'));
redisClient.on('error', (err) => logger.error('Redis Client Error', err));

// Connect to Redis on startup
(async () => {
  await redisClient.connect();
})();

export { redisClient };
```