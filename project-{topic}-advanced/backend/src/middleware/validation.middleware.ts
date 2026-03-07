```typescript
import { Request, Response, NextFunction } from 'express';
import { validate, ValidationError as ClassValidationError } from 'class-validator';
import { ClassConstructor, plainToInstance } from 'class-transformer';
import { BadRequestError } from './errorHandler.middleware';
import { ValidationError } from '../types';

export const validateRequest = (dtoClass: ClassConstructor<any>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const output: any = plainToInstance(dtoClass, req.body);
    const errors: ClassValidationError[] = await validate(output, {
      skipMissingProperties: false, // Validate all properties
      whitelist: true, // Strip properties that are not defined in the DTO
      forbidNonWhitelisted: true, // Throw an error if non-whitelisted properties are present
    });

    if (errors.length > 0) {
      const formattedErrors: ValidationError[] = errors.map((error) => ({
        property: error.property,
        constraints: error.constraints || {},
      }));
      return next(new BadRequestError('Validation failed', formattedErrors));
    }

    // Replace req.body with the transformed and validated object
    req.body = output;
    next();
  };
};
```