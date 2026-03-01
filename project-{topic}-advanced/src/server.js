```javascript
// src/server.js
const app = require('./app');
const { sequelize } = require('./database');
const logger = require('./utils/logger');
const config = require('./config/config');

const PORT = config.server.port;

const startServer = async () => {
    try {
        // Connect to the database and sync models (in production, use migrations)
        await sequelize.authenticate();
        logger.info('Database connection has been established successfully.');

        // In a production environment, you would run migrations separately:
        // await sequelize.sync({ force: false, alter: true }); // DO NOT USE force: true in production!
        // logger.info('Database models synchronized.');

        app.listen(PORT, () => {
            logger.info(`Server running on port ${PORT} in ${config.env} mode`);
        });
    } catch (error) {
        logger.error('Unable to connect to the database or start the server:', error);
        process.exit(1); // Exit with a failure code
    }
};

startServer();

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Application specific logging, throwing an error, or other logic here
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // It's critical to exit for uncaught exceptions to avoid undefined state
    process.exit(1);
});
```