import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import pick from '@/utils/pick';
import logger from '@/utils/logger';

export const validate = (schema: Record<string, Joi.Schema>) => (req: Request, res: Response, next: NextFunction) => {
  const validSchema = pick(schema, ['params', 'query', 'body']);
  const object = pick(req, Object.keys(validSchema));
  const { value, error } = Joi.compile(validSchema)
    .prefs({ errors: { label: 'key' }, abortEarly: false })
    .validate(object);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    logger.warn(`Validation Error: ${errorMessage}`);
    return next(new ApiError(httpStatus.BAD_REQUEST, errorMessage));
  }
  Object.assign(req, value);
  return next();
};