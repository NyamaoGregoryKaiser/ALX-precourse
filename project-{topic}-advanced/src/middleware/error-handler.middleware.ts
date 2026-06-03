```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError, HttpCode } from '../utils/app-error';
import { logger } from '../utils/logger';
import { env } from '../config/env';

const handleCastErrorDB = (err: any) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, HttpCode.BAD_REQUEST);
};

const handleDuplicateFieldsDB = (err: any) => {
  const value = err.message.match(/(["'])(\\?.)*?\1/)[0]; // Extract the duplicated value
  const message = `Duplicate field value: ${value}. Please use another value.`;
  return new AppError(message, HttpCode.BAD_REQUEST);
};

const handleValidationErrorDB = (err: any) => {
  const errors = Object.values(err.errors).map((el: any) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, HttpCode.BAD_REQUEST);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', HttpCode.UNAUTHORIZED);

const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', HttpCode.UNAUTHORIZED);

const sendErrorDev = (err: AppError, res: Response) => {
  logger.error(err); // Log the full error in development
  res.status(err.statusCode).json({
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

const sendErrorProd = (err: AppError, res: Response) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  } else {
    // Programming or other unknown error: don't leak error details
    logger.error('ERROR 💥', err); // Log the error
    res.status(HttpCode.INTERNAL_SERVER_ERROR).json({
      status: 'error',
      message: 'Something went very wrong!',
    });
  }
};

export const globalErrorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || HttpCode.INTERNAL_SERVER_ERROR;
  err.status = err.status || 'error';

  if (env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message; // Ensure message is copied

    // Specific error handling for common database/JWT errors
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 'P2002') error = handleDuplicateFieldsDB(error); // Prisma unique constraint violation
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (error.name === 'JsonWebTokenError') error = handleJWTError();
    if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();

    sendErrorProd(error, res);
  }
};
```