```typescript
import { createClient } from 'redis';
import { config } from './index';
import logger from '../utils/logger';

export const redisClient = createClient({
  url: `redis://${config.REDIS.HOST}:${config.REDIS.PORT}`
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));
redisClient.on('connect', () => logger.info('Redis Client Connected'));
redisClient.on('ready', () => logger.info('Redis Client Ready'));

// export async function connectRedis() {
//   if (!redisClient.isReady) {
//     await redisClient.connect();
//   }
// }
```