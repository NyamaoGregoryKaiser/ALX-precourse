```typescript
import { Request, Response, NextFunction } from 'express';
import { CustomError } from '../interfaces/error.interface';
import logger from '../config/logger';
import config from '../config';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  let customError = err;

  if (!(customError instanceof CustomError)) {
    // Convert a non-operational error to an operational one
    const statusCode = (customError as any).statusCode || 500;
    const message = customError.message || 'Something went wrong';
    customError = new CustomError(statusCode, message, false, err.stack);
  }

  // Log error (for operational errors, log info; for programming errors, log error)
  if ((customError as CustomError).isOperational) {
    logger.info(`Operational Error: ${customError.message}`);
  } else {
    logger.error(`Programming Error: ${customError.message}`, { stack: customError.stack });
  }

  res.status((customError as CustomError).statusCode).json({
    status: 'error',
    message: customError.message,
    ...(config.NODE_ENV === 'development' && { stack: customError.stack }), // Only send stack in dev
  });
};

// Catch 404 errors
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new CustomError(404, `Can't find ${req.originalUrl} on this server!`));
};
```