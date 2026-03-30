import Joi from 'joi';

const register = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(1).required(),
  lastName: Joi.string().min(1).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const authValidation = {
  register,
  login,
};
```

#### `backend/src/validation/project.validation.ts`
```typescript