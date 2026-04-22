```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const duration = Number(end - start) / 1_000_000; // Convert to milliseconds

        logger.info(`${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration.toFixed(2)}ms`, {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            durationMs: duration,
            ip: req.ip,
            userId: req.userId || 'guest' // Log user ID if available
        });
    });

    next();
};
```