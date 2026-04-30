```typescript
import app from './app';
import { config } from './config';
import { AppDataSource } from './config/data-source';
import redisClient from './config/redisClient';
import { logger } from './utils/logger';

// --- Start the server ---
const startServer = async () => {
    try {
        // Initialize Database
        await AppDataSource.initialize();
        logger.info('Database connection established successfully.');

        // Initialize Redis Client
        await redisClient.connect(); // Ensure Redis client connects

        app.listen(config.port, () => {
            logger.info(`Server running on port ${config.port} in ${config.nodeEnv} mode.`);
            logger.info(`Access API Docs at http://localhost:${config.port}/api-docs`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1); // Exit with failure code
    }
};

startServer();

// --- Handle unhandled promise rejections and uncaught exceptions ---
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // In production, consider graceful shutdown or specific error handling
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // For uncaught exceptions, it's often safer to terminate the process
    // after logging, as the application state might be corrupted.
    process.exit(1);
});
```