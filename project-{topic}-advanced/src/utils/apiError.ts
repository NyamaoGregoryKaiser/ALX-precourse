```typescript
/**
 * Custom error class for API-specific errors.
 * Provides a standardized way to return error messages and HTTP status codes.
 */
export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public data: any; // Optional additional data for the error

  constructor(statusCode: number, message: string, data: any = {}) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indicates an expected, handled error
    this.data = data;

    // Capture the stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}
```