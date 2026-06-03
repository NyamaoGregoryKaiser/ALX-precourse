```javascript
const logger = require('../utils/logger');
const config = require('../config');
const AppError = require('../utils/appError');

const sendErrorDev = (err, res) => {
  return res.status(err.statusCode).json({
    status: 'error',
    code: err.code,
    message: err.message,
    stack: err.stack,
    operational: err.isOperational,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
    });
  }

  // Programming or other unknown error: don't leak error details
  logger.error('UNHANDLED ERROR 💥', err); // Log the full error
  return res.status(500).json({
    status: 'error',
    code: 'SERVER_ERROR',
    message: 'Something went very wrong!',
  });
};

const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  err.code = err.code || 'GENERIC_ERROR';

  if (config.env === 'development') {
    sendErrorDev(err, res);
  } else {
    // In production, we don't want to send detailed error messages to the client
    // unless it's an operational error we've explicitly handled.
    let error = { ...err }; // Create a copy
    error.message = err.message;
    error.stack = err.stack;
    error.statusCode = err.statusCode;
    error.code = err.code;
    error.isOperational = err.isOperational;

    // Handle specific types of errors to make them operational
    if (err.name === 'CastError') {
      error = new AppError(`Invalid ${err.path}: ${err.value}.`, 400, 'INVALID_INPUT');
    }
    if (err.code === '23505' && err.constraint && err.constraint.includes('unique')) {
      // Postgres unique constraint violation
      const field = err.detail.match(/\((.*?)\)=\((.*?)\)/);
      error = new AppError(`Duplicate field value: ${field[2]}. Please use another value.`, 400, 'DUPLICATE_ENTRY');
    }
    // Add more specific error handling for DB errors, JWT errors etc.

    sendErrorProd(error, res);
  }
};

module.exports = globalErrorHandler;
```