```typescript
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  constructor(@Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    res.on('finish', () => {
      const { method, originalUrl, ip } = req;
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      const responseTime = Date.now() - start;

      this.logger.info(
        `[${ip}] ${method} ${originalUrl} ${statusCode} ${contentLength} - ${responseTime}ms`,
        {
          timestamp: new Date().toISOString(),
          method,
          url: originalUrl,
          statusCode,
          contentLength,
          responseTime,
          ip,
          userAgent: req.get('user-agent') || '',
        },
      );
    });
    next();
  }
}
```