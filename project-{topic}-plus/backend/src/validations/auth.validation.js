```javascript
const Joi = require('joi');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    username: Joi.string().required().min(3).max(30).alphanum(),
    role: Joi.string().valid('admin', 'editor', 'viewer').default('viewer'),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
};
```