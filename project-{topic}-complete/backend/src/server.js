```javascript
const app = require('./app');
const config = require('./config');
const logger = require('./config/logger');
const db = require('./db');
const schedulerService = require('./services/scheduler.service');

let server;

const startServer = async () => {
    try {
        // Ensure database connection and run migrations
        await db.raw('SELECT 1+1 AS result');
        logger.info('PostgreSQL connected successfully.');

        await db.migrate.latest();
        logger.info('Database migrations ran successfully.');

        // Initialize and start the scheduler
        await schedulerService.start();

        server = app.listen(config.port, () => {
            logger.info(`Server listening on port ${config.port} in ${config.env} mode`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error.message);
        process.exit(1);
    }
};

const exitHandler = async () => {
    if (server) {
        server.close(async () => {
            logger.info('Server closed');
            await db.destroy(); // Close DB connection
            await schedulerService.stop(); // Stop scheduler and puppeteer
            process.exit(1);
        });
    } else {
        await db.destroy();
        await schedulerService.stop();
        process.exit(1);
    }
};

const unexpectedErrorHandler = (error) => {
    logger.error('Unexpected error:', error);
    exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
    logger.info('SIGTERM received');
    if (server) {
        exitHandler();
    }
});
process.on('SIGINT', () => {
    logger.info('SIGINT received');
    if (server) {
        exitHandler();
    }
});

startServer();
```