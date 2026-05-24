```javascript
const Joi = require('joi');
const { roles } = require('../config/roles');

const createUser = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    username: Joi.string().required().min(3).max(30).alphanum(),
    role: Joi.string().valid(...roles).default('viewer'),
  }),
};

const getUsers = {
  query: Joi.object().keys({
    username: Joi.string(),
    email: Joi.string(),
    role: Joi.string().valid(...roles),
    sortBy: Joi.string(),
    limit: Joi.number().integer().min(1).max(100).default(10),
    page: Joi.number().integer().min(1).default(1),
  }),
};

const getUser = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required(),
  }),
};

const updateUser = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    email: Joi.string().email(),
    password: Joi.string().min(8).max(100).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/)
      .message('Password must contain at least one uppercase letter, one lowercase letter, one number and one special character'),
    username: Joi.string().min(3).max(30).alphanum(),
    role: Joi.string().valid(...roles),
    isEmailVerified: Joi.boolean(),
  }).min(1),
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required(),
  }),
};

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
```