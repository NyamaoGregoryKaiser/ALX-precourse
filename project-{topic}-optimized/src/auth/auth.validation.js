import Joi from 'joi';
import { Role } from '@prisma/client';

const register = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/) // At least one lowercase, one uppercase, one digit, one special char
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.',
      'string.min': 'Password must be at least 8 characters long.',
      'string.max': 'Password cannot exceed 128 characters.',
    }),
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  role: Joi.string().valid(Role.USER, Role.ADMIN, Role.MANAGER).optional().default(Role.USER),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const validate = (schema, property) => (req, res, next) => {
  const { error } = schema.validate(req[property]);
  if (error) {
    const errorMessage = error.details.map((detail) => detail.message).join(', ');
    return res.status(400).json({ message: errorMessage });
  }
  next();
};

export {
  register,
  login,
  validate,
};
```

```javascript