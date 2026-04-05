```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1_000_000; // Convert nanoseconds to milliseconds

    logger.info(`[${req.method}] ${req.originalUrl} - Status: ${res.statusCode} - ${durationMs.toFixed(2)}ms`, {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: parseFloat(durationMs.toFixed(2)),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      correlationId: req.headers['x-request-id'] // If you implement correlation IDs
    });
  });

  next();
};
```