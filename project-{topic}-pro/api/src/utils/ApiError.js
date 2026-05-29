```javascript
/**
 * Custom error class for API errors.
 * Extends Node.js built-in Error class.
 */
class ApiError extends Error {
  /**
   * Creates an instance of ApiError.
   * @param {number} statusCode - HTTP status code (e.g., 400, 401, 404, 500).
   * @param {string} message - A descriptive error message.
   * @param {boolean} [isOperational=true] - Indicates if the error is operational (expected) or programming (unexpected).
   * @param {string} [stack=''] - The stack trace of the error.
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message); // Call parent Error constructor
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Capture stack trace for debugging if not provided
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

module.exports = ApiError;
```