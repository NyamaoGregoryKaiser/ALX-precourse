const { APIError, NotFoundError, UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../config/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  logger.error(`Error caught by handler: ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    stack: err.stack,
    errorObject: err, // Log the entire error object for details
  });

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors; // For validation errors (Joi)

  // Handle specific error types
  if (err instanceof NotFoundError) {
    statusCode = 404;
    message = err.message;
  } else if (err instanceof UnauthorizedError) {
    statusCode = 401;
    message = err.message;
  } else if (err instanceof ForbiddenError) {
    statusCode = 403;
    message = err.message;
  } else if (err instanceof APIError) {
    // Custom APIError already has statusCode
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    // Joi validation errors
    statusCode = 400;
    message = 'Validation Error';
    errors = err.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Resource already exists';
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    errors = err.errors.map(e => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Related resource not found or invalid foreign key';
    errors = [{
      field: err.fields ? err.fields.join(',') : 'unknown',
      message: err.message,
    }];
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Invalid or expired token';
  } else if (err.name === 'SyntaxError' && err.message.includes('JSON')) {
    statusCode = 400;
    message = 'Invalid JSON in request body';
  }

  // Hide stack trace in production for security
  if (process.env.NODE_ENV === 'production' && statusCode === 500) {
    message = 'An unexpected error occurred.';
    errors = undefined; // Do not send internal error details
  }

  const errorResponse = {
    statusCode,
    message,
    ...(errors && { errors }), // Only include errors if present
    // Only include stack trace in development mode
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  };

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
```