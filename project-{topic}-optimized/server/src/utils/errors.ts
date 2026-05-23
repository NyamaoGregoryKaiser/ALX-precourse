// Custom error classes for better error handling and classification

export class CustomError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends CustomError {
  constructor(message: string = 'Bad Request') {
    super(message, 400);
  }
}

export class UnauthorizedError extends CustomError {
  constructor(message: string = 'Unauthorized') {
    super(message, 401);
  }
}

export class ForbiddenError extends CustomError {
  constructor(message: string = 'Forbidden') {
    super(message, 403);
  }
}

export class NotFoundError extends CustomError {
  constructor(message: string = 'Not Found') {
    super(message, 404);
  }
}

export class ConflictError extends CustomError {
  constructor(message: string = 'Conflict') {
    super(message, 409);
  }
}

export class InternalServerError extends CustomError {
  constructor(message: string = 'Internal Server Error') {
    super(message, 500, false); // Internal server errors are typically non-operational
  }
}
```