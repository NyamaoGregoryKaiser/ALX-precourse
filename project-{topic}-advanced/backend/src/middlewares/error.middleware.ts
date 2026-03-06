```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiErrors';
import { logger } from '../utils/logger';

// Global error handling middleware
export const errorConverter = (err: any, req: Request, res: Response, next: NextFunction) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, false, err.stack);
  }
  next(error);
};

// Error handler middleware
export const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  let { statusCode, message } = err;
  if (process.env.NODE_ENV === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = err.message;

  const response = {
    code: statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  };

  if (process.env.NODE_ENV === 'development') {
    logger.error(err);
  } else {
    logger.error(`[${req.method}] ${req.originalUrl} - Status: ${statusCode} - Message: ${message}`);
  }

  res.status(statusCode).send(response);
};
```