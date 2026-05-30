const Joi = require('joi');
const { uuid } = require('./custom.validation');

const createProject = Joi.object().keys({
  title: Joi.string().required(),
  description: Joi.string().allow('', null),
  status: Joi.string().valid('planning', 'in_progress', 'completed', 'cancelled').default('planning'),
  // ownerId is taken from authenticated user (req.user.id) in controller
});

const getProjects = Joi.object().keys({
  title: Joi.string(),
  status: Joi.string().valid('planning', 'in_progress', 'completed', 'cancelled'),
  ownerId: Joi.string().custom(uuid),
  sortBy: Joi.string(),
  limit: Joi.number().integer(),
  page: Joi.number().integer(),
});

const getProject = Joi.object().keys({
  projectId: Joi.string().custom(uuid).required(),
});

const updateProject = Joi.object().keys({
  projectId: Joi.string().custom(uuid).required(),
  body: Joi.object()
    .keys({
      title: Joi.string(),
      description: Joi.string().allow('', null),
      status: Joi.string().valid('planning', 'in_progress', 'completed', 'cancelled'),
      // ownerId cannot be updated via this route, only by specific admin action
    })
    .min(1),
});

const deleteProject = Joi.object().keys({
  projectId: Joi.string().custom(uuid).required(),
});

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};