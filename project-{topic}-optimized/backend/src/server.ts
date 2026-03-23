```typescript
import 'reflect-metadata'; // Required for TypeORM
import app from './app';
import { AppDataSource } from './database/data-source';
import { logger } from './services/logger.service';
import { redisClient } from './services/cache.service';
import { API_PORT } from './config/constants';

const startServer = async () => {
    try {
        // Initialize Database
        await AppDataSource.initialize();
        logger.info('Database connected successfully.');

        // Initialize Redis
        await redisClient.connect();
        logger.info('Redis client connected successfully.');

        // Start Express Server
        app.listen(API_PORT, () => {
            logger.info(`Server running on port ${API_PORT}`);
            logger.info(`Access API at http://localhost:${API_PORT}`);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: Error | any, promise: Promise<any>) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific error logging, perhaps crash the app for unhandled rejections
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
    logger.error('Uncaught Exception:', error);
    // Application specific error logging, crash the app to avoid corrupted state
    process.exit(1);
});
```