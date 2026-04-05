```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '../utils/api-error';
import { StatusCodes } from 'http-status-codes';

type ValidationTarget = 'body' | 'params' | 'query';

export const validate = (schema: Joi.ObjectSchema, target: ValidationTarget = 'body') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req[target], {
      abortEarly: false, // Collect all errors, not just the first one
      stripUnknown: true, // Remove unknown properties
    });

    if (error) {
      const errors = error.details.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Validation failed', errors));
    }

    // Assign validated data back to the request object
    req[target] = schema.validate(req[target]).value;
    next();
  };
};

// Common Schemas
export const idSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

export const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
});
```