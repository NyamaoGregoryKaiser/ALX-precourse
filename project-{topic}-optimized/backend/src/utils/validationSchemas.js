const Joi = require('joi');

// User Schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().min(5).max(100).required(),
  password: Joi.string().min(6).max(128).required(),
  role: Joi.string().valid('user', 'admin').default('user'), // Role should be handled by backend logic to prevent unauthorized admin creation
});

const loginSchema = Joi.object({
  email: Joi.string().email().min(5).max(100).required(),
  password: Joi.string().min(6).max(128).required(),
});

const userIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50),
  email: Joi.string().email().min(5).max(100),
  password: Joi.string().min(6).max(128),
  role: Joi.string().valid('user', 'admin'), // Only admin should be able to change roles
}).min(1); // At least one field is required for update

const userQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
});


// Product Schemas
const createProductSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).required(),
  price: Joi.number().positive().precision(2).required(),
  stock: Joi.number().integer().min(0).required(),
});

const updateProductSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().min(10),
  price: Joi.number().positive().precision(2),
  stock: Joi.number().integer().min(0),
}).min(1); // At least one field is required for update

const productIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});

const productQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().allow('').trim().optional(),
});


module.exports = {
  registerSchema,
  loginSchema,
  userIdSchema,
  updateUserSchema,
  userQuerySchema,
  createProductSchema,
  updateProductSchema,
  productIdSchema,
  productQuerySchema,
};
```