import Joi from 'joi';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const createUser = {
  body: Joi.object().keys({
    username: Joi.string().trim().min(3).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string()
      .pattern(passwordPattern)
      .required()
      .messages({
        'string.pattern.base': 'Password must be at least 8 characters long, contain uppercase, lowercase, number and special character.',
      }),
    firstName: Joi.string().trim().max(50).optional(),
    lastName: Joi.string().trim().max(50).optional(),
    isEmailVerified: Joi.boolean().optional(),
    roleIds: Joi.array().items(Joi.string().uuid()).optional(),
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
    username: Joi.string().trim().min(3).max(50).optional(),
    email: Joi.string().email().optional(),
    password: Joi.string()
      .pattern(passwordPattern)
      .optional()
      .messages({
        'string.pattern.base': 'Password must be at least 8 characters long, contain uppercase, lowercase, number and special character.',
      }),
    firstName: Joi.string().trim().max(50).optional(),
    lastName: Joi.string().trim().max(50).optional(),
    isEmailVerified: Joi.boolean().optional(),
    roleIds: Joi.array().items(Joi.string().uuid()).optional(),
  })
    .min(1), // At least one field must be provided for update
};

const deleteUser = {
  params: Joi.object().keys({
    userId: Joi.string().uuid().required(),
  }),
};

export default {
  createUser,
  getUser,
  updateUser,
  deleteUser,
};