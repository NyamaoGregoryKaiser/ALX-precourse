import config from '../../config/config.js';
import logger from '../utils/logger.js';
import AppError from '../utils/appError.js';
import { Prisma } from '@prisma/client';

/**
 * Handle specific database errors (e.g., unique constraint violation).
 * @param {Error} err - The error object.
 * @returns {AppError} A custom AppError instance.
 */
const handleDatabaseErrors = (err) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') { // Unique constraint failed
      const target = err.meta?.target || 'unknown field';
      return new AppError(`Duplicate field value: '${target}' already exists. Please use another value.`, 409);
    }
    // Add more Prisma error codes here as needed (e.g., P2025 for record not found)
    if (err.code === 'P2025') { // Record to update/delete not found
      return new AppError('Resource not found.', 404);
    }
  }
  return new AppError('Something went wrong with the database.', 500);
};

/**
 * Sends error response in development mode.
 * @param {AppError} err - The error object.
 * @param {import('express').Response} res - Express response object.
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

/**
 * Sends error response in production mode.
 * @param {AppError} err - The error object.
 * @param {import('express').Response} res - Express response object.
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err); // Log the original error
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

/**
 * Global error handling middleware.
 * @param {Error} err - The error object.
 * @param {import('express').Request} req - Express request object.
 * @param {import('express').Response} res - Express response object.
 * @param {import('express').NextFunction} next - Express next middleware function.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.env === 'development') {
    sendErrorDev(err, res);
  } else if (config.env === 'production') {
    let error = { ...err, message: err.message, name: err.name }; // Create a copy of the error

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      error = handleDatabaseErrors(error);
    } else if (error.name === 'JsonWebTokenError') {
      error = new AppError('Invalid token. Please log in again!', 401);
    } else if (error.name === 'TokenExpiredError') {
      error = new AppError('Your token has expired! Please log in again.', 401);
    } else if (error.name === 'ValidationError') { // From Joi or similar validation
      error = new AppError(`Validation error: ${error.message}`, 400);
    }

    sendErrorProd(error, res);
  }
};

export default errorHandler;
```

```javascript