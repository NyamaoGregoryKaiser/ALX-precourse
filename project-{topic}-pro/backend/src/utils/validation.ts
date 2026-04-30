```typescript
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from './appErrors';

export const validate = <T>(schema: ZodSchema<T>, data: any): T => {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof ZodError) {
            const errors = error.errors.map(err => ({
                field: err.path.join('.'),
                message: err.message,
                code: err.code
            }));
            throw new BadRequestError('Validation failed.', errors);
        }
        throw error; // Re-throw if it's not a Zod error
    }
};
```