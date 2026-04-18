```typescript
/**
 * Custom error class for operational errors.
 * These are "expected" errors that occur during normal operation (e.g., invalid input, resource not found).
 * They carry a specific HTTP status code and are safe to send details to the client.
 */
export class AppError extends Error {
  statusCode: number;
  status: string; // 'fail' for 4xx errors, 'error' for 5xx errors
  isOperational: boolean; // Flag to distinguish operational errors from programming errors
  originalError?: Error; // Optionally store the underlying error for debugging

  constructor(message: string, statusCode: number, originalError?: Error) {
    super(message); // Call parent Error constructor
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as an operational error
    this.originalError = originalError; // Store the original error for logging purposes

    // Capture stack trace, excluding the constructor call, to get cleaner traces
    Error.captureStackTrace(this, this.constructor);
  }
}
```