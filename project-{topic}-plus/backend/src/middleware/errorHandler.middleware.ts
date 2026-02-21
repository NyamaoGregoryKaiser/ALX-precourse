```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  // If it's a known operational error (AppError), use its properties
  // Otherwise, treat it as an unexpected error
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof AppError ? err.message : 'Something went wrong!';

  // Log the error
  logger.error(err.message, { stack: err.stack, name: err.name, originalError: err });

  // Send error response
  res.status(statusCode).json({
    status: 'error',
    message: message,
    // Include stack trace only in development
    stack: env.NODE_ENV === 'development' ? err.stack : undefined,
  });
};
```