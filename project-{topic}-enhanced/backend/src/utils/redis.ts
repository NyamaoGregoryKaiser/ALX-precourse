```typescript
import Redis from 'ioredis';
import config from '../config';
import logger from './logger';

const redisClient = new Redis(config.redisUrl);

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

export default redisClient;
```