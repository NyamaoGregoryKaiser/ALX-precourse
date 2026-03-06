```javascript
/**
 * Custom Error class for API specific errors.
 * Extends Node.js built-in Error, adding statusCode and isOperational properties.
 */
class ApiError extends Error {
  /**
   * Creates an instance of ApiError.
   * @param {number} statusCode - HTTP status code.
   * @param {string} message - Error message.
   * @param {boolean} [isOperational=true] - Indicates if the error is operational (expected) vs. programming (unexpected).
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

export default ApiError;
```