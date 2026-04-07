const Joi = require('joi');
const { uuid } = require('./custom.validation');

const createTask = {
  params: Joi.object().keys({ // From parent /projects/:projectId/tasks route
    projectId: Joi.string().custom(uuid).required(),
  }),
  body: Joi.object().keys({
    title: Joi.string().required(),
    description: Joi.string(),
    status: Joi.string().valid('todo', 'in-progress', 'done', 'blocked').default('todo'),
    priority: Joi.string().valid('low', 'medium', 'high').default('medium'),
    dueDate: Joi.date().iso(),
    assignedTo: Joi.string().custom(uuid),
    // projectId and createdBy are derived, not in body
  }),
};

const getTasks = {
  params: Joi.object().keys({
    projectId: Joi.string().custom(uuid), // Optional if listing all tasks, required if nested under project
  }).unknown(true), // Allow other params not explicitly defined
  query: Joi.object().keys({
    title: Joi.string(),
    status: Joi.string().valid('todo', 'in-progress', 'done', 'blocked'),
    priority: Joi.string().valid('low', 'medium', 'high'),
    assignedTo: Joi.string().custom(uuid),
    createdBy: Joi.string().custom(uuid),
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getTask = {
  params: Joi.object().keys({
    projectId: Joi.string().custom(uuid), // Optional if listing all tasks, required if nested under project
    taskId: Joi.string().custom(uuid).required(),
  }).unknown(true),
};

const updateTask = {
  params: Joi.object().keys({
    projectId: Joi.string().custom(uuid),
    taskId: Joi.string().custom(uuid).required(),
  }).unknown(true),
  body: Joi.object()
    .keys({
      title: Joi.string(),
      description: Joi.string(),
      status: Joi.string().valid('todo', 'in-progress', 'done', 'blocked'),
      priority: Joi.string().valid('low', 'medium', 'high'),
      dueDate: Joi.date().iso(),
      assignedTo: Joi.string().custom(uuid).allow(null), // Allow unassigning
      projectId: Joi.string().custom(uuid), // Allow moving task to another project (careful with permissions)
    })
    .min(1),
};

const deleteTask = {
  params: Joi.object().keys({
    projectId: Joi.string().custom(uuid),
    taskId: Joi.string().custom(uuid).required(),
  }).unknown(true),
};

module.exports = {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
};