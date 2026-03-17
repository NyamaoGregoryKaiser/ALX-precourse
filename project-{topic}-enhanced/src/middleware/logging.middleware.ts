```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * @file Request logging middleware.
 *
 * This middleware logs details about incoming HTTP requests and their responses,
 * including method, URL, status code, and response time.
 */

/**
 * Middleware to log details of each incoming request and its response.
 *
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The next middleware function.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startHrTime = process.hrtime.bigint(); // High-resolution time for timing requests

  res.on('finish', () => {
    const endHrTime = process.hrtime.bigint();
    const durationMs = Number(endHrTime - startHrTime) / 1_000_000; // Convert nanoseconds to milliseconds

    const logEntry = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      response_time_ms: durationMs.toFixed(3),
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: (req as any).user ? (req as any).user.id : 'anonymous' // If auth middleware runs before this
    };

    if (res.statusCode >= 500) {
      logger.error('HTTP Request Error', logEntry);
    } else if (res.statusCode >= 400) {
      logger.warn('HTTP Request Warning', logEntry);
    } else {
      logger.info('HTTP Request', logEntry);
    }
  });

  next();
};
```