```javascript
require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/database');
const logger = require('./utils/logger');
const { createAdminUser } = require('./utils/initialSetup');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
    try {
        // Connect to the database
        await sequelize.authenticate();
        logger.info('Database connection has been established successfully.');

        // Synchronize models (create tables if they don't exist) - not ideal for production with migrations
        // await sequelize.sync({ force: false });
        // logger.info('All models were synchronized successfully.');

        // Run migrations if not already done by Dockerfile
        // In a more robust setup, migrations are run as a separate step/container
        // For this demo, Dockerfile handles it, but locally, you'd run `npm run migrate`
        // await sequelize.sync(); // or run migrations programmatically if not using CLI
        // No explicit sync needed here if migrations are used.

        // Create initial admin user if not exists
        await createAdminUser();

        // Start the Express server
        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
            logger.info(`API Documentation available at http://localhost:${PORT}/api-docs`);
        });
    } catch (error) {
        logger.error('Unable to connect to the database or start server:', error);
        process.exit(1);
    }
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    // Optionally close server and exit process
    // server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
});
```