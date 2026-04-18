```typescript
import 'reflect-metadata'; // Required for TypeORM
import app from './app';
import { AppDataSource } from './data-source';
import config from './config/config';
import logger from './utils/logger';

const PORT = config.port;

AppDataSource.initialize()
  .then(() => {
    logger.info('Database connection established successfully.');
    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Access frontend at http://localhost:${config.frontendPort}`);
      logger.info(`API documentation at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch((error) => {
    logger.error('Error connecting to the database:', error);
    process.exit(1); // Exit process if DB connection fails
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error, promise: Promise<any>) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason.message, reason.stack);
  // Application specific logging, throwing an error, or other logic here
  // For production, you might want to gracefully shut down after logging
  process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error.message, error.stack);
  // Application specific logging, throwing an error, or other logic here
  // For production, you might want to gracefully shut down after logging
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received. Shutting down gracefully.');
  // Ideally, close the server to stop accepting new requests,
  // then wait for active connections to drain.
  // For simplicity here, we proceed with DB shutdown directly.
  AppDataSource.destroy().then(() => {
    logger.info('Database connection closed.');
    process.exit(0);
  }).catch(err => {
    logger.error('Error closing database connection during shutdown:', err);
    process.exit(1);
  });
});
```