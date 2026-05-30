const Joi = require('joi');
const { password } = require('./custom.validation');

const register = Joi.object().keys({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  role: Joi.string().valid('member', 'projectOwner', 'admin').default('member'),
});

const login = Joi.object().keys({
  email: Joi.string().required().email(),
  password: Joi.string().required(),
});

const logout = Joi.object().keys({
  refreshToken: Joi.string().required(),
});

const refreshTokens = Joi.object().keys({
  refreshToken: Joi.string().required(),
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
};