import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export class CustomError extends Error {
    statusCode: number;
    errorCode: string;
    data?: any;

    constructor(message: string, statusCode: number = 500, errorCode: string = 'SERVER_ERROR', data?: any) {
        super(message);
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.data = data;
        Object.setPrototypeOf(this, CustomError.prototype); // Maintain proper prototype chain
    }
}

export const errorHandler = (err: Error | CustomError, req: Request, res: Response, next: NextFunction) => {
    let statusCode = 500;
    let message = 'An unexpected error occurred.';
    let errorCode = 'SERVER_ERROR';
    let data = undefined;

    if (err instanceof CustomError) {
        statusCode = err.statusCode;
        message = err.message;
        errorCode = err.errorCode;
        data = err.data;
    } else {
        // Log all unhandled errors for debugging
        logger.error(`Unhandled error: ${err.message}`, {
            stack: err.stack,
            method: req.method,
            path: req.path,
            ip: req.ip,
        });
    }

    // Don't leak stack traces in production
    const errorResponse = {
        message: message,
        statusCode: statusCode,
        errorCode: errorCode,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Only include stack in dev
        ...(data && { data: data }),
    };

    res.status(statusCode).json(errorResponse);
};