```typescript
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/appErrors';

export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    // Log the error for debugging purposes
    logger.error(`Error: ${err.message}`, {
        path: req.path,
        method: req.method,
        ip: req.ip,
        stack: err.stack,
        details: err instanceof AppError ? err.details : undefined
    });

    if (res.headersSent) {
        return next(err); // Delegate to default error handler if headers were already sent
    }

    // Default error status code and message
    let statusCode = 500;
    let message = 'An unexpected error occurred.';
    let errors: any[] | undefined = undefined; // For validation errors

    if (err instanceof AppError) {
        statusCode = err.statusCode;
        message = err.message;
        if (err.errors) { // Custom property for validation errors
            errors = err.errors;
        }
    } else if (err instanceof Error && err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token.';
    } else if (err instanceof Error && err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired.';
    }

    // Send error response
    res.status(statusCode).json({
        success: false,
        message,
        ...(errors && { errors }), // Include errors array if present
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Include stack trace in dev
    });
};
```