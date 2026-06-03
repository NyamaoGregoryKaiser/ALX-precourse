```javascript
class AppError extends Error {
  constructor(message, statusCode, code = 'GENERIC_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true; // Mark as operational for graceful error handling
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
```