import app from './app';
import { config } from './config/env';
import { initializeDatabase } from './config/database';
import { logger } from './utils/logger';
import { initializeRedis } from './config/redis';

const startServer = async () => {
  try {
    // Initialize Database
    await initializeDatabase();

    // Initialize Redis Cache
    await initializeRedis();

    // Start Express server
    const port = config.PORT;
    app.listen(port, () => {
      logger.info(`Server running on port ${port} in ${config.NODE_ENV} mode`);
      logger.info(`Access Health Check at http://localhost:${port}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  // Add database/redis connection close logic if needed
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  // Add database/redis connection close logic if needed
  process.exit(0);
});