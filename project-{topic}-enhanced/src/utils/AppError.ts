```typescript
/**
 * @file Custom application error class.
 *
 * Extends the native `Error` class to include a status code, making it
 * easier to categorize and handle operational errors consistently
 * across the application, especially within Express middleware.
 */
export class AppError extends Error {
  public statusCode: number;
  public status: string;
  public isOperational: boolean;

  /**
   * Creates an instance of AppError.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code associated with the error (e.g., 400, 401, 404, 500).
   */
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as an operational error (expected error during runtime)

    // Capture the stack trace, excluding the constructor call from the stack
    Error.captureStackTrace(this, this.constructor);
  }
}
```