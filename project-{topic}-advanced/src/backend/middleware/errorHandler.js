```javascript
const { StatusCodes } = require('http-status-codes');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, StatusCodes.BAD_REQUEST);
};

const handleDuplicateFieldsDB = err => {
    const value = err.errors[0].message.match(/(["'])(\\?.)*?\1/)[0]; // Extract the duplicate value
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, StatusCodes.CONFLICT);
};

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, StatusCodes.BAD_REQUEST);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', StatusCodes.UNAUTHORIZED);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', StatusCodes.UNAUTHORIZED);

const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    });
};

const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });

        // Programming or other unknown error: don't leak error details
    } else {
        // 1) Log error
        logger.error('ERROR 💥', err);

        // 2) Send generic message
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            status: 'error',
            message: 'Something went very wrong!'
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else if (process.env.NODE_ENV === 'production') {
        let error = { ...err, message: err.message, name: err.name };

        if (error.name === 'SequelizeUniqueConstraintError') error = handleDuplicateFieldsDB(error);
        if (error.name === 'SequelizeValidationError') error = handleValidationErrorDB(error);
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        if (error.name === 'SequelizeDatabaseError' && error.parent && error.parent.code === '22P02') {
             // Handle invalid UUID (e.g., when searching by ID)
            error = handleCastErrorDB({ path: 'id', value: req.params.id || 'N/A' });
        }

        // Specific error for unauthorized roles from Joi validation or similar checks
        if (error.message && error.message.includes('Unauthorized attempt to set admin role')) {
            error = new AppError(error.message, StatusCodes.FORBIDDEN);
        }

        sendErrorProd(error, res);
    }
};
```