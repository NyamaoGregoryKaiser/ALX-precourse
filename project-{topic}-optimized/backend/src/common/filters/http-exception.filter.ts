import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from '../../utils/logger';

/**
 * Global exception filter to catch all HttpExceptions and
 * format the response consistently. It also logs the error details.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  constructor(private logger: LoggerService) {}

  /**
   * Catches an HttpException and processes it to create a standardized error response.
   * @param exception The caught HttpException.
   * @param host The arguments host for the current request.
   */
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = exception.getResponse(); // Get NestJS default error response
    const errorMessage =
      typeof errorResponse === 'string'
        ? errorResponse
        : (errorResponse as any)?.message || 'Internal server error';

    const errorDetails = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: errorMessage,
      // Include validation errors if available
      ...(typeof errorResponse === 'object' &&
      (errorResponse as any)?.statusCode === 400 &&
      (errorResponse as any)?.message
        ? { validationErrors: (errorResponse as any).message }
        : {}),
    };

    // Log the error
    this.logger.error(
      `HTTP Error (${status}) - ${request.method} ${request.url}`,
      errorMessage,
      exception.stack,
      {
        correlationId: request.headers['x-correlation-id'] || 'N/A',
        userId: (request as any).user ? (request as any).user.userId : 'Guest',
      },
    );

    response.status(status).json(errorDetails);
  }
}