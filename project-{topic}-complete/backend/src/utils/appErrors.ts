```typescript
// Base custom error class
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // For errors we expect and handle gracefully

    // Capture stack trace for debugging
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes for common HTTP status codes
export class BadRequestError extends AppError {
  constructor(message = 'Bad request: Invalid data provided.') {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized: Authentication required or invalid credentials.') {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden: You do not have permission to access this resource.') {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found: The requested resource could not be found.') {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict: The request could not be completed due to a conflict.') {
    super(message, 409);
  }
}

export class InternalServerError extends AppError {
  constructor(message = 'Internal Server Error: Something went wrong on the server.') {
    super(message, 500);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too Many Requests: You have sent too many requests in a given amount of time.') {
    super(message, 429);
  }
}
```