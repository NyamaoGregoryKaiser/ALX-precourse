```typescript
import { StatusCodes } from 'http-status-codes';

interface ErrorDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  public statusCode: StatusCodes;
  public isOperational: boolean;
  public details?: ErrorDetail[];

  constructor(statusCode: StatusCodes, message: string, details?: ErrorDetail[]) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates errors that can be handled gracefully
    this.details = details;

    // Capture stack trace, excluding constructor call from it
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Factory method to create an ApiError from an existing error.
   * Useful for catching unknown errors and converting them into a standardized ApiError.
   * @param error The original error object.
   * @param defaultStatusCode Default status code if the error doesn't have one.
   * @param defaultMessage Default message if the error doesn't have one.
   * @returns An ApiError instance.
   */
  static fromError(error: any, defaultStatusCode: StatusCodes = StatusCodes.INTERNAL_SERVER_ERROR, defaultMessage: string = 'Something went wrong.'): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    // Try to extract status code and message from common error types
    let statusCode = defaultStatusCode;
    let message = defaultMessage;

    if (error && typeof error.status === 'number') {
      statusCode = error.status;
    } else if (error && typeof error.statusCode === 'number') {
      statusCode = error.statusCode;
    }

    if (error && typeof error.message === 'string' && error.message.length > 0) {
      message = error.message;
    }

    return new ApiError(statusCode, message);
  }
}
```