```typescript
import { Catch, ArgumentsHost, HttpException, HttpStatus, LoggerService } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { CustomLogger } from '../logger/custom-logger.service';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  protected readonly logger: LoggerService;

  constructor(httpAdapter: any) {
    super(httpAdapter);
    this.logger = new CustomLogger(); // Use our custom logger
  }

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        exception instanceof HttpException
          ? (exception.getResponse() as any).message || exception.message
          : 'Internal server error',
      details:
        exception instanceof HttpException && (exception.getResponse() as any).message
          ? (exception.getResponse() as any).message
          : null,
    };

    // Log all errors, but especially internal server errors with stack trace
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method} ${request.url}] ${exception instanceof Error ? exception.message : 'Unknown Error'}`,
        exception instanceof Error ? exception.stack : 'No stack trace available',
        'AllExceptionsFilter',
      );
    } else {
      this.logger.warn(
        `[${request.method} ${request.url}] ${errorResponse.message}`,
        'AllExceptionsFilter',
      );
    }

    response.status(status).json(errorResponse);
  }
}
```