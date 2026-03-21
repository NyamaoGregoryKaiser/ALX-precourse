```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import AppError, { ErrorType } from '@utils/AppError';
import logger from '@config/logger';

export const validate = (schema: Joi.ObjectSchema) => (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });

  if (error) {
    const errorMessages = error.details.map((detail) => detail.message).join(', ');
    logger.warn(`Validation failed for request to ${req.path}: ${errorMessages}`);
    return next(new AppError(`Validation error: ${errorMessages}`, ErrorType.BAD_REQUEST));
  }

  req.body = value; // Replace req.body with the validated and sanitized value
  next();
};
```