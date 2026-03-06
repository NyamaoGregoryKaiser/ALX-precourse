```typescript
import httpStatus from 'http-status';

export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true, stack = '') {
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

// Specific error classes for common HTTP status codes
export class BadRequestError extends ApiError {
  constructor(message: string = 'Bad Request', stack?: string) {
    super(httpStatus.BAD_REQUEST, message, true, stack);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message: string = 'Unauthorized', stack?: string) {
    super(httpStatus.UNAUTHORIZED, message, true, stack);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message: string = 'Forbidden', stack?: string) {
    super(httpStatus.FORBIDDEN, message, true, stack);
  }
}

export class NotFoundError extends ApiError {
  constructor(message: string = 'Not Found', stack?: string) {
    super(httpStatus.NOT_FOUND, message, true, stack);
  }
}

export class ConflictError extends ApiError {
  constructor(message: string = 'Conflict', stack?: string) {
    super(httpStatus.CONFLICT, message, true, stack);
  }
}

export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal Server Error', stack?: string) {
    super(httpStatus.INTERNAL_SERVER_ERROR, message, false, stack);
  }
}
```