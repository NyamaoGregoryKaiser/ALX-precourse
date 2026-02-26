import app from './app';
import { PORT } from './config';
import logger from './utils/logger';
import { connectDB } from './database/data-source';
import { connectRedis } from './utils/redis';

const startServer = async () => {
  try {
    // Connect to PostgreSQL database
    await connectDB();
    logger.info('Database connected successfully.');

    // Connect to Redis cache
    await connectRedis();
    logger.info('Redis connected successfully.');

    // Start the Express server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
      logger.info(`API Docs available at http://localhost:${PORT}/api-docs`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit with failure code
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  // Give server time to finish pending requests then exit
  if (app) { // Check if app is initialized
    app.get('server').close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
  // Exit immediately as the application state is corrupted
  process.exit(1);
});