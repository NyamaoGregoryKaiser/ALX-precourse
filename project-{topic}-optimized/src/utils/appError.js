/**
 * Custom application error class.
 * Extends Error to include HTTP status codes and operational status.
 */
class AppError extends Error {
  /**
   * Creates an instance of AppError.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code associated with the error (e.g., 400, 404, 500).
   */
  constructor(message, statusCode) {
    super(message); // Call the parent constructor (Error) with the message

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error'; // 'fail' for client errors, 'error' for server errors
    this.isOperational = true; // Indicates if this is an error we anticipated and handled

    // Capture the stack trace, excluding the constructor call
    Error.captureStackTrace(this, this.constructor);
  }
}

export default AppError;
```

```javascript