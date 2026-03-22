```typescript
/**
 * Custom error class for API errors.
 * Allows specifying an HTTP status code.
 */
export class CustomError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.isOperational = isOperational; // Differentiate operational errors from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}
```

#### `backend/src/utils/validation.ts`