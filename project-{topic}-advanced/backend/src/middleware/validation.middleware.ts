import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { CustomError } from '../utils/errors.util';

export const validate = (schema: Joi.ObjectSchema) =>
  (req: Request, res: Response, next: NextFunction) => {
    const { error } = schema.validate(req.body, { abortEarly: false }); // `abortEarly: false` collects all errors

    if (error) {
      const messages = error.details.map((detail) => detail.message).join(', ');
      return next(new CustomError(`Validation error: ${messages}`, 400));
    }
    next();
  };