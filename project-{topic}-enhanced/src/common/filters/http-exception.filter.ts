```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { CustomLogger } from '../logger/custom-logger';

/**
 * Global exception filter to catch all HTTP-related exceptions
 * and format their responses consistently.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: CustomLogger) {}

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse: any = exception.getResponse();

    // Determine the error message
    // If exceptionResponse is a string, use it directly.
    // If it's an object with a message, use that.
    // Otherwise, fallback to the default HTTP status message.
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse?.message || exception.message || 'Internal server error';

    // For validation errors, NestJS typically returns an array of messages
    const errors =
      Array.isArray(message) && status === HttpStatus.BAD_REQUEST
        ? message
        : (typeof message === 'string' ? [message] : []);

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: exceptionResponse?.error || HttpStatus[status], // e.g., "Bad Request"
      message: errors.length > 0 ? errors.join(', ') : 'An unexpected error occurred', // Join validation errors or use generic message
      details: errors.length > 0 ? errors : undefined, // Provide detailed errors if available
    };

    // Log the error using the custom logger
    this.logger.error(
      `[${request.method} ${request.url}] Status: ${status} - ${JSON.stringify(errorResponse)}`,
      exception.stack, // Include stack trace for server-side logging
      HttpExceptionFilter.name,
    );

    response.status(status).json(errorResponse);
  }
}
```