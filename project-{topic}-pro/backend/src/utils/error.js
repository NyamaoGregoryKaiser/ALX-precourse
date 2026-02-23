```javascript
/**
 * Custom error class to handle API errors with specific status codes.
 */
class CustomError extends Error {
  /**
   * Creates an instance of CustomError.
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code for the error.
   */
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Capturing the stack trace keeps the original error location.
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = { CustomError };
```