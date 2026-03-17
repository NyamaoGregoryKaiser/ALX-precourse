```javascript
const Joi = require('joi');

const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid('user', 'admin').optional(),
  isActivated: Joi.boolean().optional(),
});

const userIdSchema = Joi.object({
  id: Joi.string().uuid({ version: '4' }).required().messages({
    'string.uuid': 'User ID must be a valid UUID.',
    'any.required': 'User ID is required.',
  }),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userIdSchema,
};
```