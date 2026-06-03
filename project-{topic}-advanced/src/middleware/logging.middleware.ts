```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    logger.info({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      response_time_ms: durationMs.toFixed(2),
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      userId: req.user?.id || 'guest',
    }, `[${res.statusCode}] ${req.method} ${req.originalUrl} - ${durationMs.toFixed(2)}ms`);
  });

  next();
};
```