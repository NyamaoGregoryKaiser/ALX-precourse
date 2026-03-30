import { app } from './app';
import { initializeDataSource, AppDataSource } from './db/data-source';
import { config } from './config';
import { LoggerService } from './utils/logger';
import { RedisService } from './services/cache';
import { initializeQueueAndWorker } from './services/queue'; // For BullMQ

const logger = LoggerService.getLogger();

const startServer = async () => {
  try {
    // 1. Initialize Database Connection
    await initializeDataSource(logger);
    await AppDataSource.runMigrations(); // Ensure migrations run on startup

    // 2. Initialize Redis Connection (for cache and BullMQ)
    await RedisService.connect();

    // 3. Initialize BullMQ Queue and Worker
    // The worker should ideally run in a separate process/container,
    // but for simple deployments, it can run in the same process.
    // In a production setup, you would typically run the API server
    // and worker processes in separate Docker containers.
    await initializeQueueAndWorker(logger);

    // 4. Start the Express server
    app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode`);
      logger.info(`Backend URL: ${config.backendUrl}`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit with failure code
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received. Shutting down gracefully.');
  await RedisService.disconnect();
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT signal received. Shutting down gracefully.');
  await RedisService.disconnect();
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(0);
});