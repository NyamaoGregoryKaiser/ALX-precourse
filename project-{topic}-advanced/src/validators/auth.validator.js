```javascript
const Joi = require('joi');
const { USER_ROLES } = require('../utils/constants');

const register = Joi.object().keys({
  email: Joi.string().required().email(),
  password: Joi.string().required().min(8).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).*$/)
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.',
      'string.min': 'Password must be at least 8 characters long.',
      'string.max': 'Password must not exceed 128 characters.',
    }),
  name: Joi.string().required().min(3).max(50),
  role: Joi.string().valid(USER_ROLES.USER, USER_ROLES.ADMIN).default(USER_ROLES.USER),
});

const login = Joi.object().keys({
  email: Joi.string().required().email(),
  password: Joi.string().required(),
});

module.exports = {
  register,
  login,
};
```