```typescript
import 'reflect-metadata'; // Required for TypeORM decorators
import app from './app';
import { config } from './config';
import { initializeDatabase, disconnectDatabase } from './config/database';
import logger from './utils/logger';

/**
 * Main entry point for the backend application.
 * Initializes the database, starts the Express server, and handles graceful shutdown.
 */
const startServer = async () => {
  // Initialize database connection
  await initializeDatabase();

  // Start the Express server
  const server = app.listen(config.port, () => {
    logger.info(`Server is running on port ${config.port} in ${config.nodeEnv} mode.`);
    logger.info(`Access backend at http://localhost:${config.port}`);
  });

  // --- Graceful Shutdown ---
  const gracefulShutdown = async () => {
    logger.info('Commencing graceful shutdown...');

    // Close HTTP server first
    server.close(async () => {
      logger.info('HTTP server closed.');

      // Disconnect database
      await disconnectDatabase();

      logger.info('Application shutdown complete.');
      process.exit(0); // Exit with success code
    });

    // If server takes too long to shut down, force exit
    setTimeout(() => {
      logger.error('Forcefully shutting down after timeout.');
      process.exit(1); // Exit with failure code
    }, 10000); // 10 seconds timeout
  };

  // Handle termination signals
  process.on('SIGTERM', gracefulShutdown); // Kubernetes, PM2, etc.
  process.on('SIGINT', gracefulShutdown);  // Ctrl+C
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception:', error);
    // Attempt graceful shutdown for uncaught exceptions
    gracefulShutdown();
  });
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Attempt graceful shutdown for unhandled promise rejections
    gracefulShutdown();
  });
};

// Start the server
startServer();
```