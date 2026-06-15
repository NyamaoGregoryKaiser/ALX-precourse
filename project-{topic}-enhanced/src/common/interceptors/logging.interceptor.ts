```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { CustomLogger } from '../logger/custom-logger';

/**
 * Global interceptor for logging incoming requests and outgoing responses.
 * It logs the request method, URL, status code, and response time.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: CustomLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const now = Date.now();
    const req: Request = context.switchToHttp().getRequest();
    const { method, url, ip } = req;

    return next.handle().pipe(
      tap(() => {
        const res = context.switchToHttp().getResponse();
        const { statusCode } = res;
        const responseTime = Date.now() - now;
        this.logger.log(
          `[${method} ${url}] IP: ${ip} - Status: ${statusCode} - ${responseTime}ms`,
          LoggingInterceptor.name,
        );
      }),
    );
  }
}
```