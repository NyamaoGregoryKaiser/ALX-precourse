```javascript
const logger = require('../utils/logger');
const { CustomError } = require('../utils/error');
const config = require('../config');

/**
 * Global error handling middleware for Express.
 * Catches errors from routes and other middleware, formats them, and sends a standardized response.
 * @param {Error} err - The error object.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function (unused here as it's the last handler).
 */
exports.errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log the error
  logger.error(err);

  // Mongoose Bad ObjectId
  if (err.name === 'CastError') {
    const message = `Resource not found with id of ${err.value}`;
    error = new CustomError(message, 404);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue).join(', ');
    const message = `Duplicate field value: '${field}' already exists. Please use another value.`;
    error = new CustomError(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    const message = `Validation failed: ${messages.join('. ')}`;
    error = new CustomError(message, 400);
  }

  // Joi validation error (from request body validation)
  if (err.isJoi) {
    const message = err.details.map(detail => detail.message).join(', ');
    error = new CustomError(`Validation error: ${message}`, 400);
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message || 'Server Error',
    // Only send stack trace in development mode
    stack: config.nodeEnv === 'development' ? error.stack : {},
  });
};
```