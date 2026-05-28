```javascript
const { AppError } = require('../utils/appError');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * Global error handling middleware.
 * Catches errors passed from routes/middleware and sends a standardized JSON response.
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err }; // Copy the error object
    error.message = err.message;
    error.statusCode = err.statusCode || 500;
    error.status = err.status || 'error';

    // Log the error
    logger.error(`Error: ${error.message}`, {
        statusCode: error.statusCode,
        path: req.originalUrl,
        method: req.method,
        ip: req.ip,
        stack: config.env === 'development' ? err.stack : undefined // Include stack only in dev
    });

    // Handle specific error types
    // Example: Sequelize validation error
    if (err.name === 'SequelizeValidationError') {
        const errors = Object.values(err.errors).map(el => el.message);
        const message = `Invalid input data: ${errors.join('. ')}`;
        error = new AppError(message, 400);
    }

    // Example: Sequelize unique constraint error
    if (err.name === 'SequelizeUniqueConstraintError') {
        const message = `Duplicate field value: ${Object.keys(err.fields).join(', ')}. Please use another value.`;
        error = new AppError(message, 400);
    }

    // Example: JWT malformed or expired error
    if (err.name === 'JsonWebTokenError') {
        error = new AppError('Invalid token. Please log in again!', 401);
    }
    if (err.name === 'TokenExpiredError') {
        error = new AppError('Your token has expired! Please log in again.', 401);
    }

    // Send the error response
    res.status(error.statusCode).json({
        status: error.status,
        message: error.message,
        ...(config.env === 'development' && { stack: error.stack }) // Only send stack trace in dev
    });
};

module.exports = { errorHandler };
```