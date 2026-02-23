```javascript
const config = require('../config');
const logger = require('../utils/logger');
const AppError = require('../utils/appError');

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(400, message);
};

const handleDuplicateFieldsDB = (err) => {
  const value = err.meta?.target?.[0] || 'unknown value'; // Prisma error handling
  const message = `Duplicate field value: "${value}". Please use another value!`;
  return new AppError(400, message);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(400, message);
};

const handleJWTError = () => new AppError(401, 'Invalid token. Please log in again!');
const handleJWTExpiredError = () => new AppError(401, 'Your token has expired! Please log in again.');

const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err); // Log the error
    res.status(500).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

module.exports = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (config.env === 'development') {
    logger.error('DEV ERROR:', err);
    sendErrorDev(err, res);
  } else if (config.env === 'production') {
    let error = { ...err }; // Create a shallow copy to avoid modifying original error object
    error.message = err.message; // Ensure message is copied

    // Prisma specific errors
    if (error.code === 'P2025') { // Record not found (e.g., in update/delete)
        error = new AppError(404, `Resource not found: ${error.meta?.cause || error.message}`);
    }
    if (error.code === 'P2002') { // Unique constraint violation
        error = handleDuplicateFieldsDB(error);
    }
    // Other common errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (!(error instanceof AppError)) { // Convert unknown errors to AppError
      error = new AppError(error.statusCode || 500, error.message || 'Something went wrong!', false);
    }

    sendErrorProd(error, res);
  }
};
```