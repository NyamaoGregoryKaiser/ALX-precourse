const { logger } = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Log the error using Winston
  logger.error(`Error: ${statusCode} - ${message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
    body: req.body,
    query: req.query
  });

  // Prisma specific errors
  if (err.code && err.code.startsWith('P')) { // Prisma Client error codes start with P
    switch (err.code) {
      case 'P2002': // Unique constraint failed
        return res.status(409).json({
          message: `Duplicate field value: ${err.meta?.target.join(', ')}`,
          errors: err.meta?.target || ['Unique constraint violation']
        });
      case 'P2025': // Record to update/delete not found
        return res.status(404).json({
          message: `Resource not found: ${err.meta?.modelName || 'record'}`,
          errors: err.meta?.cause || ['Record not found']
        });
      default:
        return res.status(400).json({
          message: `Database error: ${err.message}`,
          errors: [`Prisma Error Code: ${err.code}`]
        });
    }
  }

  // Joi/validation errors (if you were using a validation library like Joi or express-validator)
  // if (err.isJoi) {
  //   return res.status(400).json({
  //     message: 'Validation Error',
  //     errors: err.details.map(detail => detail.message),
  //   });
  // }

  // Generic response
  res.status(statusCode).json({
    message: process.env.NODE_ENV === 'production' && statusCode === 500 ? 'Internal Server Error' : message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack, // Don't send stack trace in production
  });
};

module.exports = errorHandler;