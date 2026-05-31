import { Request, Response, NextFunction } from 'express';
import { AnyZodObject } from 'zod';

/**
 * Middleware to validate request body, params, or query against a Zod schema.
 * @param schema The Zod schema to validate against.
 */
export const validate = (schema: AnyZodObject) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      // Parse and validate the request object (body, params, query)
      // Zod handles errors by throwing a ZodError which is caught by the global error handler
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (e: any) {
      // The global error handler will catch the ZodError
      next(e);
    }
  };
```