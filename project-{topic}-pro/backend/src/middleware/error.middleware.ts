```typescript
import { Request, Response, NextFunction } from 'express';
import AppError, { ErrorType } from '@utils/AppError';
import logger from '@config/logger';
import { config } from '@config/index';
import { QueryFailedError } from 'typeorm';

const handleCastErrorDB = (err: any) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, ErrorType.BAD_REQUEST);
};

const handleDuplicateFieldsDB = (err: any) => {
  const value = err.detail.match(/\(([^)]+)\)=\(([^)]+)\)/); // Extract key and value from postgres error message
  const field = value ? value[1] : 'unknown field';
  const duplicateValue = value ? value[2] : 'unknown value';
  const message = `Duplicate field value: '${duplicateValue}' for field '${field}'. Please use another value!`;
  return new AppError(message, ErrorType.CONFLICT);
};

const handleValidationErrorDB = (err: any) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, ErrorType.BAD_REQUEST);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', ErrorType.UNAUTHORIZED);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', ErrorType.UNAUTHORIZED);

const sendErrorDev = (err: AppError, res: Response) => {
  logger.error(err);
  res.status(err.statusCode).json({
    status: 'error',
    message: err.message,
    stack: err.stack,
    error: err,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err);
    res.status(ErrorType.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || ErrorType.INTERNAL_SERVER_ERROR;
  err.message = err.message || 'Something went wrong!';

  if (config.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (config.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message; // Ensure message is copied

    // Specific error handling for common errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === '23505' && error instanceof QueryFailedError) error = handleDuplicateFieldsDB(error); // PostgreSQL unique violation
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (!(error instanceof AppError)) error = new AppError('Something went very wrong!', ErrorType.INTERNAL_SERVER_ERROR, false);

    sendErrorProd(error as AppError, res);
  }
};

export default errorHandler;
```