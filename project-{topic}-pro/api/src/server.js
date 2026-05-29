```javascript
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');
const { connectDB, sequelize } = require('./config/db');
const { initializeRedis } = require('./utils/cache');

let server;

// Function to start the server
const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDB();

    // 2. Initialize Redis
    await initializeRedis();

    // 3. Start Express server
    server = app.listen(config.port, () => {
      logger.info(`Server listening on port ${config.port} in ${config.env} mode`);
      logger.info(`Access API at http://localhost:${config.port}${config.apiVersion}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1); // Exit process with failure code
  }
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle SIGTERM (termination signal)
process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      // Optionally close DB connection here if Sequelize doesn't handle it
      // sequelize.close();
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

startServer();
```