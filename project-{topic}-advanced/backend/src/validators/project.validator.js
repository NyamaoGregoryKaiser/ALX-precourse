const Joi = require('joi');
const { uuid } = require('./custom.validation');

const createProject = {
  body: Joi.object().keys({
    name: Joi.string().required(),
    description: Joi.string(),
    status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
    // createdBy is derived from authenticated user, not in body
    startDate: Joi.date().iso(),
    endDate: Joi.date().iso().greater(Joi.ref('startDate')),
  }),
};

const getProjects = {
  query: Joi.object().keys({
    name: Joi.string(),
    status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
    createdBy: Joi.string().custom(uuid), // For admin to filter, user will be filtered by auth middleware
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
  }),
};

const getProject = {
  params: Joi.object().keys({
    projectId: Joi.string().custom(uuid).required(),
  }),
};

const updateProject = {
  params: Joi.object().keys({
    projectId: Joi.string().custom(uuid).required(),
  }),
  body: Joi.object()
    .keys({
      name: Joi.string(),
      description: Joi.string(),
      status: Joi.string().valid('pending', 'in-progress', 'completed', 'cancelled'),
      startDate: Joi.date().iso(),
      endDate: Joi.date().iso().greater(Joi.ref('startDate')),
    })
    .min(1),
};

const deleteProject = {
  params: Joi.object().keys({
    projectId: Joi.string().custom(uuid).required(),
  }),
};

module.exports = {
  createProject,
  getProjects,
  getProject,
  updateProject,
  deleteProject,
};