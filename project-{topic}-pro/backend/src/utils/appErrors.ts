```typescript
/**
 * Custom base error class for application-specific errors.
 * Ensures all custom errors have a consistent structure.
 */
export class AppError extends Error {
    statusCode: number;
    isOperational: boolean; // Indicates if this is an error the app should handle gracefully
    errors?: any[]; // For validation errors

    constructor(message: string, statusCode: number, isOperational = true, errors?: any[]) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.errors = errors;
        Object.setPrototypeOf(this, AppError.prototype); // Maintain proper prototype chain
    }
}

/**
 * 400 Bad Request error.
 * Used for invalid input, missing parameters, etc.
 */
export class BadRequestError extends AppError {
    constructor(message: string = 'Bad Request', errors?: any[]) {
        super(message, 400, true, errors);
        this.name = 'BadRequestError';
    }
}

/**
 * 401 Unauthorized error.
 * Used when authentication fails or is missing.
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401, true);
        this.name = 'UnauthorizedError';
    }
}

/**
 * 403 Forbidden error.
 * Used when a user is authenticated but does not have permission to perform an action.
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Forbidden') {
        super(message, 403, true);
        this.name = 'ForbiddenError';
    }
}

/**
 * 404 Not Found error.
 * Used when a resource is not found.
 */
export class NotFoundError extends AppError {
    constructor(message: string = 'Resource not found') {
        super(message, 404, true);
        this.name = 'NotFoundError';
    }
}

/**
 * 409 Conflict error.
 * Used when a request conflicts with the current state of the server.
 * E.g., trying to create a resource that already exists.
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Conflict') {
        super(message, 409, true);
        this.name = 'ConflictError';
    }
}

/**
 * 500 Internal Server Error.
 * Used for unexpected errors that are not explicitly handled.
 */
export class InternalServerError extends AppError {
    constructor(message: string = 'Internal Server Error', details?: any) {
        super(message, 500, false, details); // Not operational by default, should be fixed by developer
        this.name = 'InternalServerError';
    }
}
```