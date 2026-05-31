```typescript
import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger as NestLogger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { Inject } from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    private readonly httpAdapterHost: HttpAdapterHost,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const { httpAdapter } = this.httpAdapterHost;

    const ctx = host.switchToHttp();
    const request = ctx.getRequest();
    const response = ctx.getResponse();

    const httpStatus =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as Record<string, any>)
        : { message: 'Internal server error', statusCode: httpStatus };

    const responseBody = {
      statusCode: httpStatus,
      timestamp: new Date().toISOString(),
      path: httpAdapter.getRequestUrl(request),
      message: typeof errorResponse.message === 'string' ? errorResponse.message : errorResponse.message[0] || 'Internal server error',
      // Include validation errors if available
      ...(errorResponse.statusCode === HttpStatus.BAD_REQUEST && errorResponse.message && typeof errorResponse.message !== 'string' && {
        errors: errorResponse.message,
      }),
    };

    // Log the error
    if (httpStatus === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(`[${request.method}] ${request.url} - ${exception instanceof Error ? exception.message : 'Unknown Error'}`, {
        stack: exception instanceof Error ? exception.stack : 'No stack trace available',
        payload: request.body, // Log request payload for debugging
        params: request.params,
        query: request.query,
      });
    } else {
      this.logger.warn(`[${request.method}] ${request.url} - ${responseBody.message}`, {
        statusCode: responseBody.statusCode,
      });
    }

    httpAdapter.reply(response, responseBody, httpStatus);
  }
}
```