import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Custom error class for HTTP-specific errors
export class HttpException extends Error {
    public status: number;
    public message: string;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
        this.message = message;
    }
}

// Global error handling middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    // Log the error
    logger.error(`Error: ${err.message}`, {
        status: err.status || 500,
        method: req.method,
        path: req.path,
        ip: req.ip,
        stack: err.stack,
    });

    const status = err.status || 500;
    const message = err.message || 'Internal Server Error';

    // Handle specific error types gracefully
    if (err.name === 'QueryFailedError' || err.code === '23505') { // PostgreSQL duplicate entry error code
        const detail = err.detail || 'Duplicate entry error.';
        return res.status(400).json({
            message: 'Database conflict: A record with this unique value already exists.',
            detail: detail
        });
    }

    // Send generic error response
    res.status(status).json({
        message: message,
        // In development, you might include the stack trace for debugging
        // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
};