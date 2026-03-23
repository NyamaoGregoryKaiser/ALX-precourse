```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/appError';
import { logger } from '../services/logger.service';
import { QueryFailedError } from 'typeorm';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

const handleCastErrorDB = (err: any) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err: any) => {
    const value = err.detail.match(/(["'])(?:(?=(\\?))\2.)*?\1/)[0]; // Extract duplicated value
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 409); // Conflict
};

const handleValidationErrorDB = (err: any) => {
    const errors = Object.values(err.errors).map((el: any) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () => new AppError('Invalid token. Please log in again!', 401);
const handleJWTExpiredError = () => new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err: AppError, res: Response) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err: AppError, res: Response) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    } else {
        // Programming or other unknown error: don't leak error details
        logger.error('ERROR 💥', err); // Log the error
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // Log the error
    logger.error(`Error: ${err.message}`, { stack: err.stack, method: req.method, url: req.originalUrl, body: req.body });

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err };
        error.message = err.message; // Ensure message is copied for AppError instances

        if (error.name === 'CastError') error = handleCastErrorDB(error);
        if (error.code === '23505' || error.code === '23503') { // PostgreSQL unique violation or foreign key violation
            if (error.detail && error.detail.includes('already exists')) {
                error = handleDuplicateFieldsDB(error);
            } else {
                error = new AppError('Database constraint violation.', 400);
            }
        }
        if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error instanceof JsonWebTokenError && error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error instanceof TokenExpiredError && error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        if (error.name === 'NoResultError') error = new AppError('Resource not found.', 404); // TypeORM specific

        sendErrorProd(error, res);
    }
};
```