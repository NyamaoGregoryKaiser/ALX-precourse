const Joi = require('joi');
const { USER_ROLES, TASK_STATUS } = require('../config/constants');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string()
    .valid(...Object.values(USER_ROLES))
    .default(USER_ROLES.MEMBER)
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const projectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  status: Joi.string().valid('ACTIVE', 'ARCHIVED', 'COMPLETED').default('ACTIVE')
});

const taskSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().max(500).allow('', null),
  projectId: Joi.string().uuid().required(),
  assignedToId: Joi.string().uuid().allow(null),
  status: Joi.string()
    .valid(...Object.values(TASK_STATUS))
    .default(TASK_STATUS.PENDING),
  dueDate: Joi.date().iso().allow(null),
  tags: Joi.array().items(Joi.string().max(50)).default([])
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100),
  description: Joi.string().max(500).allow('', null),
  projectId: Joi.string().uuid(), // Can update project of a task
  assignedToId: Joi.string().uuid().allow(null),
  status: Joi.string().valid(...Object.values(TASK_STATUS)),
  dueDate: Joi.date().iso().allow(null),
  tags: Joi.array().items(Joi.string().max(50))
}).min(1); // At least one field must be provided for update

const userUpdateSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30),
  email: Joi.string().email(),
  role: Joi.string().valid(...Object.values(USER_ROLES))
}).min(1);

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errorMessages = error.details.map((detail) => detail.message);
    return res.status(400).json({ message: 'Validation error', errors: errorMessages });
  }
  next();
};

module.exports = {
  registerSchema,
  loginSchema,
  projectSchema,
  taskSchema,
  updateTaskSchema,
  userUpdateSchema,
  validate
};