```javascript
// src/validation/auth.validation.js
const Joi = require('joi');
const { password } = require('./custom.validation');

// ALX Principle: Input Validation Schemas
// Use Joi to define strict validation rules for API inputs.
const register = {
    body: Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().required().email(),
        password: Joi.string().required().custom(password),
        role: Joi.string().valid('user', 'admin').default('user'), // Optional role definition
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