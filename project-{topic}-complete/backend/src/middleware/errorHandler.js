const AppError = require('../utils/appError');
const logger = require('../config/logger');

// Centralized error handling middleware
const errorHandler = (err, req, res, next) => {
  // Log the error for debugging
  logger.error(err.stack || err.message);

  // Default error values
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Something went wrong!';

  // Handle specific types of errors
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = err.errors.map(e => e.message).join(', ');
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = err.errors.map(e => e.message || `${e.path} already in use`).join(', ');
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = `Invalid foreign key: ${err.index}`;
  } else if (err.name === 'CastError' && err.kind === 'ObjectId') { // For MongoDB, but good pattern
    statusCode = 400;
    message = `Invalid ${err.path}: ${err.value}`;
  } else if (err.name === 'ValidationError') { // For Joi validation errors
    statusCode = 400;
    message = err.details.map(e => e.message).join(', ');
  } else if (err instanceof AppError) {
    // Custom operational errors
    statusCode = err.statusCode;
    message = err.message;
  } else if (err.code === 'LIMIT_FILE_SIZE') { // For file upload errors
    statusCode = 413;
    message = 'File size too large!';
  }

  // Send the error response
  res.status(statusCode).json({
    status: 'error',
    statusCode: statusCode,
    message: message,
    // In development, send stack trace for debugging
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;