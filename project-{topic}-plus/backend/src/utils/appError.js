```javascript
/**
 * Custom error class for operational errors.
 * These are errors that we expect and can handle gracefully (e.g., validation errors, not found).
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as an operational error

    // Capture stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { AppError };
```