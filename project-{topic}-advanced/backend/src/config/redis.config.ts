```typescript
import Redis from 'ioredis';
import { env } from './env.config';
import { logger } from '../shared/utils/logger';

// Create a new Redis instance
// In a production environment, you might want to use connection pooling
// or a more robust client configuration.
const redisClient = new Redis({
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Disable retries on initial connect for quicker failure detection
  enableOfflineQueue: false, // Prevents commands from being queued when offline
});

redisClient.on('connect', () => {
  logger.info('Redis client connected');
});

redisClient.on('error', (err) => {
  logger.error('Redis client error:', err);
  // Depending on your application's needs, you might want to gracefully
  // degrade functionality or attempt to reconnect here.
});

// A function to set up Redis, mainly for initial connection logging.
export async function setupRedis() {
  // We can perform a dummy command to check connectivity
  try {
    await redisClient.ping();
    logger.info('Redis connection test successful.');
  } catch (error) {
    logger.error('Redis connection test failed:', error);
    // If Redis is critical, you might want to throw an error and stop the app
    // throw new Error('Failed to connect to Redis.');
  }
}

export { redisClient };
```

#### Database Layer