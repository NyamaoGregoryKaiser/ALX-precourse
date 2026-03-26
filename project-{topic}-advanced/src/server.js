```javascript
const app = require('./app');
const config = require('../config/config');
const logger = require('./utils/logger');
const { sequelize } = require('./models'); // Import sequelize instance

let server;

// Function to establish database connection and start the server
const startServer = async () => {
  try {
    // Test database connection
    await sequelize.authenticate();
    logger.info('Database connection has been established successfully.');

    // Apply database migrations
    // In production, you might run migrations explicitly or via CI/CD.
    // For development, auto-migrate on startup can be convenient.
    if (process.env.NODE_ENV !== 'test') { // Don't auto-migrate for tests, manage manually
      await sequelize.sync({ alter: true }); // `alter: true` updates schema based on models
      logger.info('Database schema synchronized.');
    }

    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port} in ${config.env} mode.`);
    });
  } catch (error) {
    logger.error('Unable to connect to the database or start server:', error);
    process.exit(1);
  }
};

// Start the application
startServer();

// Handle unhandled promise rejections
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error('Unhandled error:', error);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

// Handle SIGTERM (termination signal)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});
```