const Joi = require('joi');
const { uuid } = require('./custom.validation');

const createTask = Joi.object().keys({
  title: Joi.string().required(),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('to_do', 'in_progress', 'done').default('to_do'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
  dueDate: Joi.date().iso().allow(null),
  projectId: Joi.string().custom(uuid).required(),
  assignedTo: Joi.string().custom(uuid).allow(null),
});

const getTasks = Joi.object().keys({
  title: Joi.string(),
  status: Joi.string().valid('to_do', 'in_progress', 'done'),
  priority: Joi.string().valid('low', 'medium', 'high'),
  projectId: Joi.string().custom(uuid),
  assignedTo: Joi.string().custom(uuid),
  sortBy: Joi.string(),
  limit: Joi.number().integer(),
  page: Joi.number().integer(),
});

const getTask = Joi.object().keys({
  taskId: Joi.string().custom(uuid).required(),
});

const updateTask = Joi.object().keys({
  taskId: Joi.string().custom(uuid).required(),
  body: Joi.object()
    .keys({
      title: Joi.string(),
      description: Joi.string().allow('', null),
      status: Joi.string().valid('to_do', 'in_progress', 'done'),
      priority: Joi.string().valid('low', 'medium', 'high'),
      dueDate: Joi.date().iso().allow(null),
      projectId: Joi.string().custom(uuid),
      assignedTo: Joi.string().custom(uuid).allow(null),
    })
    .min(1),
});

const deleteTask = Joi.object().keys({
  taskId: Joi.string().custom(uuid).required(),
});

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};