import app from './app';
import { env } from './config/env';
import { connectDb, disconnectDb } from './config/prisma';
import { logger } from './utils/logger';

const PORT = env.PORT;

// Start the server
const startServer = async () => {
  try {
    // Connect to the database
    await connectDb();

    // Start listening for requests
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${env.NODE_ENV} mode.`);
    });

    // Handle unhandled promise rejections (e.g., DB connection errors not caught by connectDb)
    process.on('unhandledRejection', (err: Error) => {
      logger.error('UNHANDLED REJECTION! Shutting down...', err);
      // Close server and then exit process
      server.close(() => {
        disconnectDb().finally(() => {
          process.exit(1);
        });
      });
    });

    // Handle uncaught exceptions (synchronous errors)
    process.on('uncaughtException', (err: Error) => {
      logger.error('UNCAUGHT EXCEPTION! Shutting down...', err);
      // Exit process immediately, no need to close server if it's a sync error
      disconnectDb().finally(() => {
        process.exit(1);
      });
    });

    // Handle graceful shutdown on SIGTERM (e.g., from Docker)
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(() => {
        disconnectDb().finally(() => {
          logger.info('Process terminated.');
          process.exit(0);
        });
      });
    });

    // Handle graceful shutdown on SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        disconnectDb().finally(() => {
          logger.info('Process terminated.');
          process.exit(0);
        });
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```