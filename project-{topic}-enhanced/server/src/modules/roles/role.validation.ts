import Joi from 'joi';

const createRole = {
  body: Joi.object().keys({
    name: Joi.string().trim().min(3).max(50).required(),
    description: Joi.string().trim().max(255).optional(),
    permissionIds: Joi.array().items(Joi.string().uuid()).optional(),
  }),
};

const getRole = {
  params: Joi.object().keys({
    roleId: Joi.string().uuid().required(),
  }),
};

const updateRole = {
  params: Joi.object().keys({
    roleId: Joi.string().uuid().required(),
  }),
  body: Joi.object().keys({
    name: Joi.string().trim().min(3).max(50).optional(),
    description: Joi.string().trim().max(255).optional(),
    permissionIds: Joi.array().items(Joi.string().uuid()).optional(),
  }).min(1),
};

const deleteRole = {
  params: Joi.object().keys({
    roleId: Joi.string().uuid().required(),
  }),
};

export default {
  createRole,
  getRole,
  updateRole,
  deleteRole,
};