```javascript
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');
const appConfig = require('../config/app');

const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error(`Error: ${err.message}`, { stack: err.stack, requestId: req.id });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong on the server.';
  let isOperational = err.isOperational || false;

  // Handle specific types of errors
  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409; // Conflict
    message = err.errors[0].message || 'Resource already exists.';
    isOperational = true;
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400; // Bad Request
    message = err.errors.map(e => e.message).join(', ');
    isOperational = true;
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401; // Unauthorized
    message = 'Invalid token, please log in again.';
    isOperational = true;
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401; // Unauthorized
    message = 'Token has expired, please log in again.';
    isOperational = true;
  } else if (err.name === 'CastError' && err.kind === 'ObjectId') { // For Mongoose, if used
    statusCode = 400; // Bad Request
    message = `Resource not found with id of ${err.value}`;
    isOperational = true;
  } else if (err.isJoi) { // For Joi validation errors
    statusCode = 400;
    message = err.details.map(detail => detail.message).join(', ');
    isOperational = true;
  }

  // In production, don't leak stack traces or sensitive error details
  if (appConfig.env === 'production' && !isOperational) {
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.status(statusCode).json({
    success: false,
    message: message,
    // Only send stack trace in development or if explicitly allowed
    stack: appConfig.env === 'development' ? err.stack : undefined,
  });
};

module.exports = errorHandler;
```