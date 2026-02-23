```javascript
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const createTaskSchema = Joi.object({
  title: Joi.string()
    .min(3)
    .max(150)
    .required()
    .messages({
      'string.min': 'Task title must be at least 3 characters long',
      'string.max': 'Task title cannot exceed 150 characters',
      'any.required': 'Task title is required',
    }),
  description: Joi.string()
    .max(1000)
    .required()
    .messages({
      'string.max': 'Task description cannot exceed 1000 characters',
      'any.required': 'Task description is required',
    }),
  projectId: Joi.objectId() // This can be passed in body or extracted from URL params
    .required()
    .messages({
      'string.pattern.name': 'Invalid Project ID format',
      'any.required': 'Project ID is required',
    }),
  assignedTo: Joi.objectId()
    .required()
    .messages({
      'string.pattern.name': 'Invalid AssignedTo User ID format',
      'any.required': 'Assigned user is required',
    }),
  status: Joi.string()
    .valid('To Do', 'In Progress', 'Done', 'Blocked', 'Cancelled')
    .default('To Do'),
  priority: Joi.string()
    .valid('Low', 'Medium', 'High', 'Urgent')
    .default('Medium'),
  dueDate: Joi.date()
    .iso()
    .greater('now') // Due date must be in the future (or 'now' for immediate tasks)
    .required()
    .messages({
      'date.greater': 'Due date must be in the future',
      'any.required': 'Due date is required',
    }),
});

const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(150),
  description: Joi.string().max(1000),
  assignedTo: Joi.objectId(),
  status: Joi.string().valid('To Do', 'In Progress', 'Done', 'Blocked', 'Cancelled'),
  priority: Joi.string().valid('Low', 'Medium', 'High', 'Urgent'),
  dueDate: Joi.date().iso().greater('now'),
});

exports.createTaskValidation = (req, res, next) => {
  // If projectId is in URL params, add it to body for validation
  if (req.params.projectId && !req.body.projectId) {
    req.body.projectId = req.params.projectId;
  }
  const { error } = createTaskSchema.validate(req.body, { abortEarly: false });
  if (error) return next(error);
  next();
};

exports.updateTaskValidation = (req, res, next) => {
  const { error } = updateTaskSchema.validate(req.body, { abortEarly: false });
  if (error) return next(error);
  next();
};
```