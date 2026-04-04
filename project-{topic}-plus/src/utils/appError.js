```javascript
/**
 * Custom application error class.
 * Extends Error to include a status code and an operational flag.
 * Operational errors are those expected and handled by the application,
 * like invalid input or unauthorized access. Non-operational errors
 * are programming errors that should typically crash the application
 * or be caught by a global exception handler.
 */
class AppError extends Error {
  /**
   * Create an AppError instance.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code associated with the error.
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as operational error

    // Capture the stack trace, excluding the constructor call itself
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```