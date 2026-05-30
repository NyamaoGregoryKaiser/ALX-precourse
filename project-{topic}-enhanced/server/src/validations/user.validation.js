const Joi = require('joi');
const { password, uuid } = require('./custom.validation');

const createUser = Joi.object().keys({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().required().email(),
  password: Joi.string().required().custom(password),
  role: Joi.string().valid('member', 'projectOwner', 'admin').default('member'),
});

const getUsers = Joi.object().keys({
  firstName: Joi.string(),
  lastName: Joi.string(),
  email: Joi.string().email(),
  role: Joi.string().valid('member', 'projectOwner', 'admin'),
  sortBy: Joi.string(),
  limit: Joi.number().integer(),
  page: Joi.number().integer(),
});

const getUser = Joi.object().keys({
  userId: Joi.string().custom(uuid).required(),
});

const updateUser = Joi.object().keys({
  userId: Joi.string().custom(uuid).required(),
  body: Joi.object()
    .keys({
      firstName: Joi.string(),
      lastName: Joi.string(),
      email: Joi.string().email(),
      password: Joi.string().custom(password),
      role: Joi.string().valid('member', 'projectOwner', 'admin'),
    })
    .min(1),
});

const deleteUser = Joi.object().keys({
  userId: Joi.string().custom(uuid).required(),
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};