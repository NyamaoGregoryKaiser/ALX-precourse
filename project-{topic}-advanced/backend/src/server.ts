```typescript
import 'reflect-metadata';
import app from './app';
import config from './config';
import { initializeDatabase } from './config/database';
import logger from './services/logger.service';
import cacheService from './services/cache.service';

const startServer = async () => {
  try {
    // Initialize database connection
    await initializeDatabase();

    // Start Redis client (handled internally by cacheService constructor)
    // Check connection status after a short delay to allow async connection to establish
    setTimeout(() => {
        if (!cacheService.getIsConnected()) {
            logger.warn('Redis is not connected. Caching will be unavailable.');
        }
    }, 2000);


    // Start the Express server
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port ${config.port} in ${config.env} mode.`);
      logger.info(`Access backend at http://localhost:${config.port}`);
      logger.info(`Frontend expected at ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Application specific error handling, e.g., graceful shutdown
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', error);
      server.close(() => {
        process.exit(1);
      });
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received. Shutting down gracefully...');
      server.close(async () => {
        logger.info('HTTP server closed.');
        await cacheService.close(); // Close Redis connection
        await AppDataSource.destroy(); // Close TypeORM connection
        logger.info('Database and Redis connections closed.');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
```

#### `backend/src/modules/auth/auth.routes.ts`