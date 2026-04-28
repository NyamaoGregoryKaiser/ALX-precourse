import { Catch, ArgumentsHost, HttpException, HttpStatus, ExceptionFilter } from '@nestjs/common';
import { Request, Response } from 'express';
import { AppLogger } from '../logger/app-logger.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: AppLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof message === 'object' ? (message as any).message || message : message,
      error: typeof message === 'object' ? (message as any).error || 'Internal Server Error' : message,
    };

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      // Log full stack trace for unexpected errors
      this.logger.error(
        `[${request.method} ${request.url}] ${JSON.stringify(errorResponse)} - Stack: ${(exception as Error).stack}`,
        (exception as Error).stack,
        AllExceptionsFilter.name,
      );
    } else {
      // Log client errors with less verbosity
      this.logger.warn(
        `[${request.method} ${request.url}] ${JSON.stringify(errorResponse)}`,
        AllExceptionsFilter.name,
      );
    }

    response.status(status).json(errorResponse);
  }
}