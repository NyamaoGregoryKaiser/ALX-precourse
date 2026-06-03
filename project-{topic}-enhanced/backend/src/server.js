```javascript
const app = require('./app');
const config = require('./config');
const logger = require('./utils/logger');
// Ensure DB and Redis connections are established on startup
require('./config/db');
require('./config/redis');

// Uncaught Exceptions (synchronous code)
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  process.exit(1); // Exit with failure code
});

const server = app.listen(config.port, () => {
  logger.info(`${config.appName} Backend running on port ${config.port} in ${config.env} mode.`);
});

// Unhandled Rejections (asynchronous code)
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...');
  logger.error(err.name, err.message, err.stack);
  server.close(() => {
    process.exit(1); // Exit with failure code
  });
});

// Handle graceful shutdown for Docker signals
process.on('SIGTERM', () => {
  logger.info('SIGTERM RECEIVED. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT RECEIVED. Shutting down gracefully...');
  server.close(() => {
    logger.info('Process terminated.');
    process.exit(0);
  });
});
```