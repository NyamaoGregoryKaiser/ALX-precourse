```typescript
import 'reflect-metadata'; // Required for TypeORM decorators
import app from './app';
import { AppDataSource } from './database/data-source';
import logger from './utils/logger';
import { redisClient } from './config/redis';

const PORT = process.env.PORT || 5000;

// Initialize Database Connection
AppDataSource.initialize()
  .then(async () => {
    logger.info('Database connected successfully');

    // Initialize Redis Client
    await redisClient.connect();
    logger.info('Redis client connected successfully');

    // Start the server
    app.listen(PORT, () => {
      logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
    });
  })
  .catch((error) => {
    logger.error('Database connection failed:', error);
    process.exit(1); // Exit process if DB connection fails
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error(`Unhandled Rejection: ${err.message}`, err.stack);
  // Consider gracefully shutting down here or sending alerts
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error(`Uncaught Exception: ${err.message}`, err.stack);
  // Log and exit, as the application state is corrupted
  process.exit(1);
});
```