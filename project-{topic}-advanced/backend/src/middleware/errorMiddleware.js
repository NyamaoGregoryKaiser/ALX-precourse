const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error with stack trace for server-side debugging
  logger.error(`Error: ${statusCode} - ${message}`, err);

  // Send a more user-friendly error response in production
  // but include stack trace in development for easier debugging.
  res.status(statusCode).json({
    message: message,
    // Include stack trace only in development environment
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    errors: err.errors // For validation errors (e.g., from Sequelize)
  });
};

module.exports = { errorHandler };