const httpStatus = require('http-status');
const logger = require('../utils/logger');

// Custom error handler middleware
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // If the error is not an operational error (e.g., programming errors),
  // set a generic 500 status and message for production environments.
  if (!err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = httpStatus[httpStatus.INTERNAL_SERVER_ERROR]; // Generic error message
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Show stack trace in dev
  };

  logger.error(err); // Log the full error

  res.status(statusCode).send(response);
};

// Catch 404 errors (not found)
const notFound = (req, res, next) => {
  res.status(httpStatus.NOT_FOUND).json({ message: 'Not Found' });
};

module.exports = {
  errorHandler,
  notFound
};