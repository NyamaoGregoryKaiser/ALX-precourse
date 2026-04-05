```typescript
import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/api-error';
import logger from '../utils/logger';
import { StatusCodes } from 'http-status-codes';
import { env } from '../config';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err); // If headers already sent, let Express handle it or log it
  }

  const apiError = ApiError.fromError(err);

  // Log the error
  logger.error(`[${req.method}] ${req.originalUrl} - Status: ${apiError.statusCode} - ${apiError.message}`, {
    error: apiError.message,
    statusCode: apiError.statusCode,
    stack: apiError.stack,
    timestamp: new Date().toISOString(),
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Send error response
  res.status(apiError.statusCode).json({
    message: apiError.message,
    // Only send stack trace in development or if specifically requested (e.g., via config)
    ...(env.NODE_ENV === 'development' && { stack: apiError.stack }),
  });
};
```