```typescript
import Joi from 'joi';

export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address.',
    'string.empty': 'Email is required.',
    'any.required': 'Email is required.'
  }),
  password: Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long.',
    'string.empty': 'Password is required.',
    'any.required': 'Password is required.'
  }),
  name: Joi.string().min(3).max(50).required().messages({
    'string.min': 'Name must be at least 3 characters long.',
    'string.max': 'Name cannot exceed 50 characters.',
    'string.empty': 'Name is required.',
    'any.required': 'Name is required.'
  }),
  address: Joi.string().allow('').optional(), // Optional address
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional().messages({
    'string.pattern': 'Phone number is invalid.'
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Email must be a valid email address.',
    'string.empty': 'Email is required.',
    'any.required': 'Email is required.'
  }),
  password: Joi.string().required().messages({
    'string.empty': 'Password is required.',
    'any.required': 'Password is required.'
  }),
});
```