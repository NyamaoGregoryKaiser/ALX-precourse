/**
 * Custom error class for operational errors.
 * These are errors that are expected and can be handled gracefully (e.g., validation errors, not found).
 * Programming errors (bugs) should ideally be caught before they become operational errors.
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Mark as operational error

    // Capture stack trace for better debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;