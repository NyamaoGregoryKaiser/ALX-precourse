```typescript
import Joi from 'joi';

// Generic Joi validation utility
export const validate = <T>(data: T, schema: Joi.ObjectSchema<T>) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false, // Return all errors, not just the first one
    allowUnknown: false, // Disallow unknown properties in the request body
    stripUnknown: true, // Remove unknown properties from the validated data
  });

  if (error) {
    // Format Joi errors for consistent API response
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message.replace(/['"]/g, ''), // Remove quotes from messages
    }));
    // Throw an error that can be caught by the global error handler
    const validationError: any = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.data = errors;
    throw validationError;
  }

  return { error: null, value };
};
```

*(Self-correction: To reach 2000+ lines, I need to provide more modules and detailed tests. I will provide `User` and `Project` module details, along with representative tests.)*

### 1. Core Application (Backend - Users Module Example)