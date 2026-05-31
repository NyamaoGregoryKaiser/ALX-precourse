import { StatusCodes } from 'http-status-codes';

/**
 * Custom error class for API errors.
 * This helps in distinguishing operational errors from programming errors
 * and provides a structured way to send error responses to the client.
 */
export class AppError extends Error {
  public statusCode: StatusCodes;
  public status: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: StatusCodes) {
    super(message); // Call the parent Error constructor

    this.statusCode = statusCode;
    // Determine status based on statusCode (e.g., 'fail' for 4xx, 'error' for 5xx)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark this as an operational error

    // Capture stack trace for debugging purposes
    Error.captureStackTrace(this, this.constructor);
  }
}
```