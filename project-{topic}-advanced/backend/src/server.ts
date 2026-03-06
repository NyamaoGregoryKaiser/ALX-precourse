```typescript
import app from './app';
import { initializeDataSource, seedDatabase } from './data-source';
import { connectRedis, closeRedis } from './config/redis';
import { logger } from './utils/logger';
import { config } from './config';
import { tokenService } from './services/token.service'; // For cleaning blacklisted tokens

let server: any;

const startServer = async () => {
  try {
    // Connect to PostgreSQL
    await initializeDataSource();
    logger.info('Database connected successfully.');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully.');

    // Seed data in development/test environments
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      await seedDatabase();
    }

    // Start Express server
    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Schedule cleanup of expired blacklisted tokens (e.g., every hour)
    setInterval(() => {
      tokenService.cleanExpiredBlacklistedTokens()
        .then(() => logger.debug('Cleaned expired blacklisted tokens.'))
        .catch(err => logger.error('Error cleaning blacklisted tokens:', err));
    }, 60 * 60 * 1000); // Every hour

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit with a failure code
  }
};

const exitHandler = async () => {
  if (server) {
    server.close(async () => {
      logger.info('Server closed.');
      await closeRedis(); // Close Redis connection
      await AppDataSource.destroy(); // Close DB connection
      process.exit(1);
    });
  } else {
    await closeRedis();
    await AppDataSource.destroy();
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error: Error) => {
  logger.error('Unhandled error:', error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});

startServer();
```