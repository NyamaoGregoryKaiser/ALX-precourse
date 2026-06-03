```typescript
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './database/prisma-client';
import { redisClient } from './utils/redis-client';

const PORT = env.PORT;

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await prisma.$connect();
    logger.info('Connected to PostgreSQL database');

    // Connect to Redis
    await redisClient.connect();
    logger.info('Connected to Redis cache');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    logger.error('Failed to connect to database or start server:', error);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM signal received: Closing HTTP server');
    await prisma.$disconnect();
    await redisClient.quit();
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
    process.exit(1); // Exit with a failure code
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error.message, error.stack);
    // Application specific logging, throwing an error, or other logic here
    process.exit(1); // Exit with a failure code
  });
};

startServer();

```