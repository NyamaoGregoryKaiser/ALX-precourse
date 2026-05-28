```javascript
/**
 * Custom error class for operational errors.
 * These are errors that we can anticipate and handle gracefully.
 * Examples: invalid input, resource not found, authentication failure.
 */
class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Mark as operational error

        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = { AppError };
```