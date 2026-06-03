```typescript
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';
import { AppError, HttpCode } from '../utils/app-error';

export const validate = (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (err: any) {
      // Zod errors have a specific format
      const errors = err.errors.map((error: any) => ({
        path: error.path.join('.'),
        message: error.message,
      }));
      next(new AppError('Validation failed', HttpCode.BAD_REQUEST, errors));
    }
  };
```

#### Utilities