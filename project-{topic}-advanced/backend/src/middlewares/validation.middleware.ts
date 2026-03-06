```typescript
import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { BadRequestError } from '../utils/apiErrors';
import httpStatus from 'http-status';

// This function processes validation schemas defined using Joi.
// It works for req.body, req.params, req.query.
const validate = (schema: Record<string, Joi.Schema>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const validSchema = Object.keys(schema).reduce((obj, key) => {
      if (schema[key]) {
        return { ...obj, [key]: schema[key] };
      }
      return obj;
    }, {});

    const obj = {
      body: req.body,
      query: req.query,
      params: req.params
    };

    const { value, error } = Joi.compile(validSchema)
      .prefs({ errors: { label: 'key' }, abortEarly: false })
      .validate(obj, { allowUnknown: true }); // Allow unknown fields in the original request object

    if (error) {
      const errorMessage = error.details.map((details) => details.message).join(', ');
      return next(new BadRequestError(errorMessage));
    }

    // Merge validated values back into req object, ensuring types align (careful with this, can be tricky)
    Object.assign(req, value);
    return next();
  };

export default validate;
```