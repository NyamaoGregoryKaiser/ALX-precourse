```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../logger/logger.service';

@Catch() // Catch all exceptions
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorMessage =
      typeof errorResponse === 'object' && 'message' in errorResponse
        ? errorResponse['message']
        : errorResponse;

    const formattedMessage = Array.isArray(errorMessage)
      ? errorMessage.join(', ')
      : errorMessage;

    const responseBody = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: formattedMessage,
    };

    // Log the error
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${request.method}] ${request.url} - ${status} - ${formattedMessage}`,
        exception instanceof Error ? exception.stack : 'No stack',
        'AllExceptionsFilter',
      );
    } else {
      this.logger.warn(
        `[${request.method}] ${request.url} - ${status} - ${formattedMessage}`,
        'AllExceptionsFilter',
      );
    }

    response.status(status).json(responseBody);
  }
}
```