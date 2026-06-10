```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../shared/utils/logger';

// Middleware to log incoming HTTP requests
export const httpLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  // Listen for the 'finish' event to log after the response is sent
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // Convert nanoseconds to milliseconds

    logger.http(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration.toFixed(2)}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user ? req.user.id : 'guest', // If auth middleware runs before this
    });
  });

  next();
};

// Middleware to log errors, specifically before the global error handler
export const errorLogger = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error encountered: ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    stack: err.stack,
    // Add more context if needed
  });
  next(err); // Pass the error to the next error handling middleware
};
```