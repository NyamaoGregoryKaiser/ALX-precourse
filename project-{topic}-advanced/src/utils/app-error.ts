```typescript
// Define HTTP status codes for better readability
export enum HttpCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// Custom error class for operational errors
export class AppError extends Error {
  public readonly name: string;
  public readonly httpCode: HttpCode;
  public readonly isOperational: boolean;
  public readonly status: string;
  public readonly errors?: any[]; // For validation errors

  constructor(
    message: string,
    httpCode: HttpCode,
    errors?: any[],
    isOperational: boolean = true,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain

    this.name = this.constructor.name;
    this.httpCode = httpCode;
    this.status = `${httpCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;
    this.errors = errors;

    Error.captureStackTrace(this, this.constructor); // Capture stack trace for debugging
  }

  // Method to serialize the error for API responses
  serializeErrors() {
    return {
      status: this.status,
      message: this.message,
      ...(this.errors && { errors: this.errors }),
    };
  }
}
```