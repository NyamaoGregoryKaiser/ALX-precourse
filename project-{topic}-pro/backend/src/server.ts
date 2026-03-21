```typescript
import app from './app';
import { connectDB, disconnectDB } from '@config/database';
import { connectRedis, disconnectRedis } from '@config/redis';
import logger from '@config/logger';
import { config } from '@config/index';

const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Connect to Redis
    await connectRedis();

    const server = app.listen(config.PORT, () => {
      logger.info(`Server running on port ${config.PORT} in ${config.NODE_ENV} mode.`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err: Error) => {
      logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
      logger.error(`${err.name}: ${err.message}`, err.stack);
      server.close(async () => {
        await disconnectDB();
        await disconnectRedis();
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (err: Error) => {
      logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
      logger.error(`${err.name}: ${err.message}`, err.stack);
      server.close(async () => {
        await disconnectDB();
        await disconnectRedis();
        process.exit(1);
      });
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received. Shutting down gracefully.');
      server.close(async () => {
        await disconnectDB();
        await disconnectRedis();
        logger.info('Process terminated!');
      });
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Shutting down gracefully.');
      server.close(async () => {
        await disconnectDB();
        await disconnectRedis();
        logger.info('Process terminated!');
      });
    });

  } catch (error) {
    logger.error(`Failed to start server: ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
};

startServer();
```