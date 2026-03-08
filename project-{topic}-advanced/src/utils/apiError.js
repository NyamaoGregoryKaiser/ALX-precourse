```javascript
/**
 * @extends Error
 */
class ApiError extends Error {
  /**
   * Creates an API error.
   * @param {number} statusCode - HTTP status code of error.
   * @param {string} message - Message of error.
   * @param {boolean} [isOperational=true] - Whether the error is operational or a programming error.
   * @param {string} [stack=''] - Error stack trace.
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