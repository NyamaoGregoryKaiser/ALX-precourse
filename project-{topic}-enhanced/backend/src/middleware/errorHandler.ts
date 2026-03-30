import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import httpStatus from 'http-status';
import logger from '../config/logger';
import config from '../config';

const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  let { statusCode, message } = err instanceof ApiError ? err : { statusCode: httpStatus.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' };

  if (config.env === 'production' && !err.isOperational) {
    statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    message = 'Internal Server Error';
  }

  res.locals.errorMessage = message;

  const response = {
    statusCode,
    message,
    ...(config.env === 'development' && { stack: err.stack }),
  };

  if (config.env === 'development') {
    logger.error(err);
  } else {
    logger.error(message);
  }

  res.status(statusCode).send(response);
};

export default errorHandler;
```

#### `backend/src/middleware/logging.ts` (Request logging)
```typescript