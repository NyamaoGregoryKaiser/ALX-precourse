```javascript
const Joi = require('joi');
Joi.objectId = require('joi-objectid')(Joi);

const createProjectSchema = Joi.object({
  name: Joi.string()
    .min(3)
    .max(100)
    .required()
    .messages({
      'string.min': 'Project name must be at least 3 characters long',
      'string.max': 'Project name cannot exceed 100 characters',
      'any.required': 'Project name is required',
    }),
  description: Joi.string()
    .max(500)
    .required()
    .messages({
      'string.max': 'Project description cannot exceed 500 characters',
      'any.required': 'Project description is required',
    }),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  status: Joi.string().valid('active', 'archived', 'on-hold', 'completed').default('active'),
  // Owner is automatically set by the server based on the authenticated user.
  // Members can be added via a separate endpoint after creation or if desired at creation, but requires specific logic.
  // For simplicity, owner is automatically added as a manager, and members are added via /members endpoint.
});

const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100),
  description: Joi.string().max(500),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')),
  status: Joi.string().valid('active', 'archived', 'on-hold', 'completed'),
  // owner and members are not directly updatable via this endpoint for security/logic reasons.
  // Member management is via addProjectMember/removeProjectMember.
});

const addMemberSchema = Joi.object({
  userId: Joi.objectId().required().messages({
    'string.pattern.name': 'Invalid User ID format',
    'any.required': 'User ID is required',
  }),
  role: Joi.string().valid('developer', 'manager').default('developer'),
});

exports.createProjectValidation = (req, res, next) => {
  const { error } = createProjectSchema.validate(req.body, { abortEarly: false });
  if (error) return next(error);
  next();
};

exports.updateProjectValidation = (req, res, next) => {
  const { error } = updateProjectSchema.validate(req.body, { abortEarly: false });
  if (error) return next(error);
  next();
};

exports.addMemberValidation = (req, res, next) => {
  const { error } = addMemberSchema.validate(req.body, { abortEarly: false });
  if (error) return next(error);
  next();
};
```