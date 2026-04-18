```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

/**
 * Middleware to log details of incoming HTTP requests and their responses.
 * Logs method, URL, status code, duration, IP, user agent, and (if authenticated) user ID.
 * This provides valuable operational insights and helps in debugging.
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now(); // Record start time of the request

  // Listen for the 'finish' event to log details after the response has been sent
  res.on('finish', () => {
    const duration = Date.now() - start; // Calculate request duration
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: duration,
      ip: req.ip,
      userAgent: req.get('user-agent'),
      // Include user ID if available from authentication middleware
      userId: req.user?.userId,
      userEmail: req.user?.email,
      correlationId: req.headers['x-request-id'] || 'N/A' // Example: Use a correlation ID for tracing
    };

    // Log based on status code
    if (res.statusCode >= 500) {
      logger.error(`HTTP 5xx Server Error: ${req.method} ${req.originalUrl}`, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP 4xx Client Error: ${req.method} ${req.originalUrl}`, logData);
    } else {
      logger.info(`HTTP Request: ${req.method} ${req.originalUrl}`, logData);
    }
  });

  next(); // Pass control to the next middleware
};
```