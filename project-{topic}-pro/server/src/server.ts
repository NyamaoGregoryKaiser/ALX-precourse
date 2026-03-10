import 'reflect-metadata'; // Required for TypeORM
import { AppDataSource } from './database/data-source';
import { createApp } from './app';
import { config } from './config';
import { Logger } from './utils/logger';
import { RedisServiceInstance } from './services/redis.service';

const startServer = async () => {
  try {
    // Initialize Database
    await AppDataSource.initialize();
    Logger.info('Database connected successfully!');

    // Initialize Redis Service
    await RedisServiceInstance.set('server:status', 'active', 60); // Example Redis usage

    const { server } = createApp();

    server.listen(config.port, () => {
      Logger.info(`Server running on port ${config.port}`);
      Logger.info(`Client accessible at ${config.clientUrl}`);
      Logger.info(`API documentation: /api-docs (if Swagger setup)`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
      Logger.error('Unhandled Rejection at:', promise, 'reason:', reason.message || reason);
      // Application specific logging, throwing an error, or other logic here
      // For production, consider graceful shutdown
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      Logger.error('Uncaught Exception:', error.message, error.stack);
      // For production, consider graceful shutdown
      server.close(() => {
        process.exit(1);
      });
    });

  } catch (error) {
    Logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();