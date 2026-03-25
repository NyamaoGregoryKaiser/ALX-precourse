```typescript
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError } from 'class-validator';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { StatusCodes } from 'http-status-codes';
import ApiError from '../utils/ApiError';

const formatErrors = (errors: ValidationError[]): string => {
  return errors
    .map((err) =>
      Object.values(err.constraints || {})
        .map((msg) => msg)
        .join(', ')
    )
    .join('; ');
};

const validationMiddleware = (type: ClassConstructor<any>, value: 'body' | 'query' | 'params' = 'body') =>
  async (req: Request, res: Response, next: NextFunction) => {
    const data = plainToInstance(type, req[value]);
    const errors = await validate(data, { skipMissingProperties: false, whitelist: true, forbidNonWhitelisted: true });

    if (errors.length > 0) {
      next(new ApiError(StatusCodes.BAD_REQUEST, formatErrors(errors)));
    } else {
      // Assign the validated and transformed object back to the request
      // This ensures that the controller receives the clean, validated data.
      req[value] = data;
      next();
    }
  };

export default validationMiddleware;
```