const logger = require('./logger');

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true; // Marks operational errors (expected)
        Error.captureStackTrace(this, this.constructor);
    }
}

const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error(`Error occurred: ${err.message}`, {
        statusCode: err.statusCode || 500,
        stack: err.stack,
        path: req.path,
        method: req.method,
        ip: req.ip,
        user: req.user ? req.user.id : 'guest',
        isOperational: err.isOperational
    });

    // Default error values
    let statusCode = err.statusCode || 500;
    let message = err.message || 'Something went wrong!';

    // Handle specific types of errors (e.g., database errors, validation errors)
    if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token. Please log in again!';
    } else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Your token has expired. Please log in again!';
    } else if (err.name === 'SequelizeUniqueConstraintError') {
        statusCode = 409; // Conflict
        message = `Duplicate entry: ${err.errors.map(e => e.message).join(', ')}`;
    } else if (err.name === 'SequelizeValidationError') {
        statusCode = 400; // Bad Request
        message = `Validation error: ${err.errors.map(e => e.message).join(', ')}`;
    } else if (err.name === 'SequelizeForeignKeyConstraintError') {
        statusCode = 400; // Bad Request
        message = `Invalid reference: ${err.message}`;
    }

    // Send error response
    res.status(statusCode).json({
        status: `${statusCode}`.startsWith('4') ? 'fail' : 'error',
        message: message,
        // In development, send stack trace for debugging
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = {
    AppError,
    errorHandler
};