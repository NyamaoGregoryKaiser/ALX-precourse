```typescript
import logger from '@config/logger';

export enum ErrorType {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  INTERNAL_SERVER_ERROR = 500,
}

class AppError extends Error {
  public statusCode: ErrorType;
  public isOperational: boolean;

  constructor(message: string, statusCode: ErrorType, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype); // Fix for instanceOf checks
    logger.error(`AppError: ${statusCode} - ${message}`, this.stack);
  }
}

export default AppError;
```