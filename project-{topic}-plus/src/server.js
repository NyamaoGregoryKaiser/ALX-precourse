```javascript
const config = require('./config');
const logger = require('./config/logger');
const { connectDb, disconnectDb } = require('./config/db');
const { connectRedis, disconnectRedis } = require('./config/redis');
const app = require('./app');

let server;

/**
 * Starts the application server.
 */
async function startServer() {
  try {
    // 1. Connect to PostgreSQL database
    await connectDb();

    // 2. Connect to Redis
    await connectRedis();

    // 3. Start the Express server
    server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on port ${config.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

/**
 * Handles uncaught exceptions and unhandled promise rejections.
 * Ensures graceful shutdown by closing resources.
 * @param {Error} err - The error object.
 * @param {string} type - The type of error ('uncaughtException' or 'unhandledRejection').
 */
function handleGracefulShutdown(err, type) {
  logger.error(`${type} 💥 Shutting down...`, err);
  if (server) {
    server.close(async () => {
      await disconnectDb();
      await disconnectRedis();
      process.exit(1);
    });
  } else {
    // If server hasn't even started, just exit
    process.exit(1);
  }
}

// Listen for uncaught exceptions (synchronous errors)
process.on('uncaughtException', (err) => handleGracefulShutdown(err, 'UNCAUGHT EXCEPTION'));

// Start the server
startServer();

// Listen for unhandled promise rejections (asynchronous errors)
process.on('unhandledRejection', (err) => handleGracefulShutdown(err, 'UNHANDLED REJECTION'));

// Handle SIGTERM for graceful Docker shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully.');
  if (server) {
    server.close(async () => {
      await disconnectDb();
      await disconnectRedis();
      logger.info('Server closed. Database and Redis disconnected.');
      process.exit(0);
    });
  } else {
    await disconnectDb();
    await disconnectRedis();
    process.exit(0);
  }
});
```