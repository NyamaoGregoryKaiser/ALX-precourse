```javascript
/**
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Creates an instance of ApiError.
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Error message.
   * @param {boolean} isOperational - Whether the error is operational (expected) or programming (unexpected).
   * @param {string} stack - Error stack trace.
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
```