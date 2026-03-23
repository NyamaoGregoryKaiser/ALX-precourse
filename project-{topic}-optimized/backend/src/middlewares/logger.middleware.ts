```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../services/logger.service';

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime.bigint();

    res.on('finish', () => {
        const end = process.hrtime.bigint();
        const durationMs = Number(end - start) / 1_000_000; // Convert nanoseconds to milliseconds

        const logMessage = `${req.method} ${req.originalUrl} - ${res.statusCode} ${res.statusMessage} - ${durationMs.toFixed(2)}ms`;

        if (res.statusCode >= 500) {
            logger.error(logMessage);
        } else if (res.statusCode >= 400) {
            logger.warn(logMessage);
        } else {
            logger.info(logMessage);
        }
    });

    next();
};
```