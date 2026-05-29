```javascript
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const config = require('../config/config');
const logger = require('../config/logger');

/**
 * Convert an error to an ApiError if it's not already one.
 * @param {Error} err - The error object.
 * @returns {ApiError}
 */
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || error instanceof Error ? httpStatus.INTERNAL_SERVER_ERROR : httpStatus.BAD_REQUEST;
    const message = error.message || httpStatus[statusCode];
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

/**
 * Centralized error handling middleware.
 * Sends appropriate error responses.
 * @param {ApiError} err - The error to handle.
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // If in production and it's an operational error (i.e., not an ApiError initially),
  // mask the generic 500 message for security.
  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message; // Make error message available to views if needed

  const response = {
    code: statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }), // Show stack trace in development
  };

  if (config.env === 'development') {
    logger.error(err); // Log the full error in development
  } else {
    // Log only critical errors in production or specific details
    logger.error(`Error ${statusCode}: ${message}`);
  }

  res.status(statusCode).send(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
```