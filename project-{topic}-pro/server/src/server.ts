import 'reflect-metadata';
import app from './app';
import http from 'http';
import { initializeDataSource } from './config/data-source';
import socketService from './services/socketService';
import logger from './config/logger';
import redisClient from './config/redis'; // Import redis client to ensure it's initialized

const PORT = process.env.PORT || 5000;

async function bootstrap() {
    try {
        // 1. Initialize Database Connection
        await initializeDataSource();
        logger.info('Database connection established.');

        // 2. Create HTTP Server
        const server = http.createServer(app);

        // 3. Initialize Socket.IO
        socketService.initializeSocketIO(server);
        logger.info('Socket.IO instance created and attached to HTTP server.');

        // 4. Start HTTP Server
        server.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
            logger.info(`For API, visit http://localhost:${PORT}/api`);
            logger.info(`For Frontend, visit ${process.env.CLIENT_URL || 'http://localhost:3000'}`);
        });

        // Handle server shutdown gracefully
        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received. Shutting down gracefully...');
            await AppDataSource.destroy();
            await redisClient.quit();
            server.close(() => {
                logger.info('HTTP server closed.');
                process.exit(0);
            });
        });

        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
            // Optionally, exit the process after logging
            // process.exit(1);
        });

        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            // Must exit for uncaught exceptions after logging
            process.exit(1);
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

bootstrap();