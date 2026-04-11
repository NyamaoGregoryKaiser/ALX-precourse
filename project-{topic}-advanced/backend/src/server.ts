```typescript
import app from './app';
import { config } from './config';
import logger from './utils/logger';
import { redisClient } from './utils/redisClient';

const PORT = config.port;

const startServer = async () => {
  try {
    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${config.nodeEnv} mode`);
    });
  } catch (error) {
    logger.error('Failed to connect to Redis or start server:', error);
    process.exit(1); // Exit process with failure
  }
};

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing HTTP server');
  await redisClient.quit();
  logger.info('Redis client disconnected');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  await redisClient.quit();
  logger.info('Redis client disconnected');
  process.exit(0);
});

startServer();
```