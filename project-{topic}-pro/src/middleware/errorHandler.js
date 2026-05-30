const logger = require('../utils/logger');
const config = require('../config');

// Catch all asynchronous errors
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application specific termination or recovery logic
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Force exit to restart the application cleanly
  process.exit(1);
});

// Centralized error handling middleware for Express
const errorHandler = (err, req, res, next) => {
  logger.error('API Error:', err.message, err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Something went wrong on the server.';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    // Include stack trace only in development
    stack: config.env === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;