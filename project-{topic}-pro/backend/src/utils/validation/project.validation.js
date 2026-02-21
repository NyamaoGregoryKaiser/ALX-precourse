const Joi = require('joi');

const createProjectSchema = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().allow('').max(1000).optional(),
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().allow('').max(1000).optional(),
}).min(1); // At least one field is required for update

module.exports = {
  createProjectSchema,
  updateProjectSchema,
};