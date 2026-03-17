const logger = require('../utils/logger');
const config = require('../config');

// Custom Error Class for API errors
class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor); // Captures stack trace
  }
}

// Global error handling middleware
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // If the error is not an operational error (e.g., from mongoose, joi, etc.)
  // or a custom ApiError, set a generic 500 status and message.
  if (!(err instanceof ApiError)) {
    statusCode = err.statusCode || 500;
    message = err.message || 'Internal Server Error';
  }

  // Log the error
  logger.error(`${statusCode} - ${message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  if (config.env === 'development') {
    logger.error(err.stack); // Log stack trace in development
  }

  res.status(statusCode).json({
    status: 'error',
    code: statusCode,
    message: message,
    // Include stack trace only in development
    ...(config.env === 'development' && { stack: err.stack }),
  });
};

module.exports = {
  ApiError,
  errorHandler,
};