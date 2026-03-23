```typescript
import Joi from 'joi';

export const registerSchema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
        .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})'))
        .required()
        .messages({
            'string.pattern.base': 'Password must be at least 8 characters long, contain an uppercase letter, a lowercase letter, a number, and a special character.'
        }),
    role: Joi.string().valid('USER', 'MERCHANT', 'ADMIN').default('USER'),
});

export const loginSchema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
});
```