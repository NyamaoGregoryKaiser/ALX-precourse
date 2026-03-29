import Joi from 'joi';

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

const register = {
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
    roleIds: Joi.array().items(Joi.string().uuid()).optional(), // For admin to assign roles
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  body: Joi.object().keys({
    token: Joi.string().required(),
    newPassword: Joi.string()
      .pattern(passwordPattern)
      .required()
      .messages({
        'string.pattern.base': 'New password must be at least 8 characters long, contain uppercase, lowercase, number and special character.',
      }),
  }),
};

export default {
  register,
  login,
  refreshTokens,
  logout,
  forgotPassword,
  resetPassword,
};