```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1_000_000; // duration in ms

    logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration.toFixed(2)}ms`);
  });

  next();
};
```