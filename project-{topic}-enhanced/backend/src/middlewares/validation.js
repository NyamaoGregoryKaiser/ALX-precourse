```javascript
const Joi = require('joi');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

/**
 * Validates request body, params, or query against a Joi schema.
 * @param {object} schema - Joi schema object with properties for body, params, query.
 * e.g., { body: Joi.object({ name: Joi.string().required() }), params: Joi.object({ id: Joi.string().guid().required() }) }
 */
const validate = (schema) => catchAsync((req, res, next) => {
  const validationOptions = {
    abortEarly: false, // include all errors
    allowUnknown: true, // allow unknown keys that will be stripped
    stripUnknown: true // remove unknown keys
  };

  const { error, value } = schema.validate({
    body: req.body,
    params: req.params,
    query: req.query,
  }, validationOptions);

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new AppError(400, errorMessage));
  }

  // Assign validated data back to req object, stripped of unknown keys
  Object.assign(req, value);
  return next();
});

// Joi Schemas for common validations
const userSchemas = {
  register: Joi.object({
    body: Joi.object({
      name: Joi.string().min(3).max(50).required(),
      email: Joi.string().email().required(),
      password: Joi.string().min(8).max(50).required().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])')),
      // Password must contain at least one lowercase, one uppercase, one digit, one special character
      role: Joi.string().valid('MEMBER', 'MANAGER', 'ADMIN').default('MEMBER'),
    }).required(),
  }),
  login: Joi.object({
    body: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required(),
    }).required(),
  }),
  updateUser: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }).required(),
    body: Joi.object({
      name: Joi.string().min(3).max(50),
      email: Joi.string().email(),
      role: Joi.string().valid('MEMBER', 'MANAGER', 'ADMIN'),
      password: Joi.string().min(8).max(50).pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])')),
    }).min(1).required(), // At least one field is required for update
  }),
};

const projectSchemas = {
  createProject: Joi.object({
    body: Joi.object({
      name: Joi.string().min(3).max(100).required(),
      description: Joi.string().max(500).allow(''),
      managerId: Joi.string().uuid().required(),
      memberIds: Joi.array().items(Joi.string().uuid()).default([]),
    }).required(),
  }),
  updateProject: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }).required(),
    body: Joi.object({
      name: Joi.string().min(3).max(100),
      description: Joi.string().max(500).allow(''),
      status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED'),
      managerId: Joi.string().uuid(),
      addMemberIds: Joi.array().items(Joi.string().uuid()).default([]),
      removeMemberIds: Joi.array().items(Joi.string().uuid()).default([]),
    }).min(1).required(),
  }),
  getProjectById: Joi.object({
    params: Joi.object({
      id: Joi.string().uuid().required(),
    }).required(),
  }),
};

const taskSchemas = {
  createTask: Joi.object({
    params: Joi.object({
      projectId: Joi.string().uuid().required(),
    }).required(),
    body: Joi.object({
      title: Joi.string().min(3).max(100).required(),
      description: Joi.string().max(500).allow(''),
      assignedToId: Joi.string().uuid().required(),
      priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH').default('MEDIUM'),
      dueDate: Joi.date().iso().min('now').allow(null),
    }).required(),
  }),
  updateTask: Joi.object({
    params: Joi.object({
      projectId: Joi.string().uuid().required(),
      id: Joi.string().uuid().required(),
    }).required(),
    body: Joi.object({
      title: Joi.string().min(3).max(100),
      description: Joi.string().max(500).allow(''),
      assignedToId: Joi.string().uuid(),
      status: Joi.string().valid('PENDING', 'IN_PROGRESS', 'COMPLETED'),
      priority: Joi.string().valid('LOW', 'MEDIUM', 'HIGH'),
      dueDate: Joi.date().iso().allow(null),
    }).min(1).required(),
  }),
  getTaskById: Joi.object({
    params: Joi.object({
      projectId: Joi.string().uuid().required(),
      id: Joi.string().uuid().required(),
    }).required(),
  }),
};

const commentSchemas = {
  createComment: Joi.object({
    params: Joi.object({
      taskId: Joi.string().uuid().required(),
    }).required(),
    body: Joi.object({
      content: Joi.string().min(1).max(500).required(),
    }).required(),
  }),
  updateComment: Joi.object({
    params: Joi.object({
      taskId: Joi.string().uuid().required(),
      id: Joi.string().uuid().required(),
    }).required(),
    body: Joi.object({
      content: Joi.string().min(1).max(500).required(),
    }).required(),
  }),
  getCommentById: Joi.object({
    params: Joi.object({
      taskId: Joi.string().uuid().required(),
      id: Joi.string().uuid().required(),
    }).required(),
  }),
};

module.exports = {
  validate,
  userSchemas,
  projectSchemas,
  taskSchemas,
  commentSchemas,
};
```