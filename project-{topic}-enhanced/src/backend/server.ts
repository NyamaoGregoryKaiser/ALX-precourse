import app from './app';
import { AppDataSource } from './database/data-source';
import { logger } from './utils/logger';
import config from './config';
import { redisClient } from './services/CacheService';

const PORT = config.server.port;

const startServer = async () => {
    try {
        // Ensure database is initialized before starting server
        await AppDataSource.initialize();
        logger.info('Database initialized successfully.');

        // Initialize Redis client
        await redisClient.connect();
        logger.info('Redis connected successfully.');

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT}`);
            logger.info(`Access API at http://localhost:${PORT}`);
            if (config.client.url) {
                logger.info(`Access Frontend at ${config.client.url}`);
            }
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1); // Exit process
});