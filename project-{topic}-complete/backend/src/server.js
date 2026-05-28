```javascript
const app = require('./app');
const { sequelize } = require('./config/db');
const logger = require('./utils/logger');
const config = require('./config/config');

const PORT = config.port;

const startServer = async () => {
    try {
        // Connect to the database
        await sequelize.authenticate();
        logger.info('Database connected successfully.');

        // Apply migrations (optional, can be done separately in CI/CD)
        // For development convenience, we can run migrations here.
        // In production, migrations should typically be run as a separate step
        // before the application starts, to avoid race conditions or errors
        // during scaling.
        // await sequelize.sync({ alter: true }); // Use `alter: true` for schema changes, `force: true` to drop and recreate
        // logger.info('Database migrations applied (if any).');

        // Start the Express server
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${config.env} mode`);
            logger.info(`API Documentation: /${config.apiVersion}/docs (if enabled)`);
        });
    } catch (error) {
        logger.error('Failed to connect to the database or start server:', error);
        process.exit(1); // Exit process with failure
    }
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
});
```