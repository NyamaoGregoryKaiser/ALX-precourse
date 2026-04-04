```javascript
const config = require('../../config');
const logger = require('../../config/logger');
const AppError = require('../../utils/appError');

/**
 * Handle specific database errors (e.g., Prisma unique constraint violations).
 * @param {Error} err - The error object.
 * @returns {AppError} A new AppError instance.
 */
const handlePrismaError = (err) => {
  if (err.code === 'P2002') {
    // P2002: Unique constraint violation
    const target = err.meta?.target || 'unknown field';
    const message = `Duplicate field value: '${target}'. Please use another value.`;
    return new AppError(message, 409); // 409 Conflict
  }
  // Add more Prisma error handlers as needed (e.g., P2025 for record not found)
  // For P2025, generally a 404 is handled by checking for null in services.
  return new AppError('Database error occurred.', 500);
};

/**
 * Handle JWT errors.
 * @param {Error} err - The error object.
 * @returns {AppError} A new AppError instance.
 */
const handleJWTError = (err) => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = (err) => new AppError('Your token has expired! Please log in again.', 401);

/**
 * Send detailed error response in development.
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
const sendErrorDev = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    return res.status(err.statusCode).json({
      status: err.status,
      error: err,
      message: err.message,
      stack: err.stack,
    });
  }

  // B) RENDERED WEBSITE (not applicable for API-only backend but good practice)
  logger.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: err.message,
  });
};

/**
 * Send concise error response in production.
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 */
const sendErrorProd = (err, req, res) => {
  // A) API
  if (req.originalUrl.startsWith('/api')) {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
      return res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
      });
    }
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err); // Log the error for debugging
    return res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }

  // B) RENDERED WEBSITE (not applicable)
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).render('error', {
      title: 'Something went wrong!',
      msg: err.message,
    });
  }
  // Programming or other unknown error: don't leak error details
  logger.error('ERROR 💥', err);
  return res.status(err.statusCode).render('error', {
    title: 'Something went wrong!',
    msg: 'Please try again later.',
  });
};

/**
 * Global error handling middleware.
 * @param {Error} err - The error object caught from previous middlewares.
 * @param {import('express').Request} req - The Express request object.
 * @param {import('express').Response} res - The Express response object.
 * @param {import('express').NextFunction} next - The Express next middleware function.
 */
module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.env === 'development') {
    sendErrorDev(err, req, res);
  } else if (config.env === 'production') {
    let error = { ...err, message: err.message, name: err.name, code: err.code }; // Create a copy

    if (error.name === 'JsonWebTokenError') error = handleJWTError(error);
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError(error);
    if (error.code && error.code.startsWith('P')) error = handlePrismaError(error);

    sendErrorProd(error, req, res);
  }
};
```