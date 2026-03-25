import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { LoggerService } from '../../utils/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Global logging interceptor to log incoming requests and outgoing responses.
 * It also assigns a correlation ID to each request for better tracing.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private logger: LoggerService) {}

  /**
   * Intercepts incoming requests and outgoing responses to log details.
   * @param context The execution context of the request.
   * @param next The call handler to proceed with the request.
   * @returns {Observable<any>} An observable stream of the response.
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const { method, url, ip } = request;
    const userAgent = request.get('user-agent') || '';
    const correlationId = uuidv4(); // Generate a unique ID for each request

    // Add correlation ID to request and response headers for tracing
    request.headers['x-correlation-id'] = correlationId;
    response.setHeader('x-correlation-id', correlationId);

    const now = Date.now();

    // Log incoming request
    this.logger.log(
      `Incoming Request - ${method} ${url}`,
      'Request',
      {
        correlationId,
        ip,
        userAgent,
        body: request.body,
        query: request.query,
        params: request.params,
        userId: (request as any).user ? (request as any).user.userId : 'Guest', // If authenticated
      },
    );

    return next.handle().pipe(
      tap((data) => {
        const responseTime = Date.now() - now;
        const statusCode = response.statusCode;

        // Log outgoing response
        this.logger.log(
          `Outgoing Response - ${method} ${url} ${statusCode} - ${responseTime}ms`,
          'Response',
          {
            correlationId,
            statusCode,
            responseTime,
            data: data, // Log response data (can be filtered for sensitive info)
            userId: (request as any).user ? (request as any).user.userId : 'Guest',
          },
        );
      }),
    );
  }
}