```typescript
import { Request, Response, NextFunction } from 'express';
import * as yup from 'yup';
import { CustomError } from './error';
import { UserRole } from '../entities/User';

/**
 * Middleware for validating request bodies, query parameters, or route parameters using Yup.
 * @param schema The Yup schema to validate against.
 * @param target The target part of the request to validate ('body', 'query', or 'params').
 */
export const validate = (schema: yup.AnySchema, target: 'body' | 'query' | 'params') =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.validate(req[target], { abortEarly: false });
      next();
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        // Collect all validation errors
        const errors = error.inner.map(err => ({
          path: err.path,
          message: err.message,
        }));
        return next(new CustomError('Validation Failed', 400, false)); // We could pass `errors` in a real app
      }
      next(error); // Pass other errors to the error handler
    }
  };

// --- Common Validation Schemas ---

export const registerSchema = yup.object({
  body: yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string()
      .min(8, 'Password must be at least 8 characters long')
      .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
      .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .matches(/[0-9]/, 'Password must contain at least one number')
      .matches(/[^a-zA-Z0-9]/, 'Password must contain at least one special character')
      .required('Password is required'),
    role: yup.string().oneOf(Object.values(UserRole)).optional().default(UserRole.USER),
  }).required(),
});

export const loginSchema = yup.object({
  body: yup.object({
    email: yup.string().email('Invalid email format').required('Email is required'),
    password: yup.string().required('Password is required'),
  }).required(),
});

export const createDatabaseSchema = yup.object({
  body: yup.object({
    name: yup.string().min(3).required('Database name is required'),
    type: yup.string().oneOf(['postgresql', 'mysql', 'sqlserver', 'oracle']).required('Database type is required'),
    connectionString: yup.string().url('Invalid connection string format').required('Connection string is required'),
    description: yup.string().optional(),
  }).required(),
});

export const createSlowQuerySchema = yup.object({
  body: yup.object({
    query: yup.string().min(10).required('Query string is required'),
    executionTimeMs: yup.number().min(0).required('Execution time in ms is required'),
    clientApplication: yup.string().optional(),
    clientHostname: yup.string().optional(),
    databaseId: yup.string().uuid('Invalid database ID format').required('Database ID is required'),
    reporterId: yup.string().uuid('Invalid reporter ID format').optional(),
  }).required(),
});

export const getSlowQueriesSchema = yup.object({
  query: yup.object({
    page: yup.number().integer().min(1).default(1),
    limit: yup.number().integer().min(1).max(100).default(10),
    databaseId: yup.string().uuid().optional(),
    minExecutionTimeMs: yup.number().min(0).optional(),
    sortBy: yup.string().oneOf(['executionTimeMs', 'reportedAt']).default('reportedAt'),
    sortOrder: yup.string().oneOf(['ASC', 'DESC']).default('DESC'),
  }),
});
```

#### `backend/src/modules/auth/auth.controller.ts`