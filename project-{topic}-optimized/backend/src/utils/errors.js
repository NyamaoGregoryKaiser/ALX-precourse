/**
 * Base custom error class.
 */
class APIError extends Error {
  constructor(message, statusCode = 500, type = 'APIError') {
    super(message);
    this.name = type;
    this.statusCode = statusCode;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Custom error for 404 Not Found.
 */
class NotFoundError extends APIError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NotFoundError');
  }
}

/**
 * Custom error for 401 Unauthorized.
 */
class UnauthorizedError extends APIError {
  constructor(message = 'Authentication required', code = 'UNAUTHORIZED') {
    super(message, 401, 'UnauthorizedError');
    this.code = code;
  }
}

/**
 * Custom error for 403 Forbidden.
 */
class ForbiddenError extends APIError {
  constructor(message = 'Access forbidden') {
    super(message, 403, 'ForbiddenError');
  }
}

module.exports = {
  APIError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
};
```