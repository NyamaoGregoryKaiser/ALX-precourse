```typescript
import Joi from 'joi';

export const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().pattern(new RegExp('^[a-zA-Z0-9!@#$%^&*()_]{6,30}$')).required(),
  role: Joi.string().valid('user', 'admin', 'manager').default('user')
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const projectSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  status: Joi.string().valid('planned', 'in-progress', 'completed', 'cancelled').default('planned'),
  ownerId: Joi.string().uuid().optional() // Will be set by auth middleware
});

export const updateProjectSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).optional(),
  status: Joi.string().valid('planned', 'in-progress', 'completed', 'cancelled').optional()
});

export const taskSchema = Joi.object({
  title: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  projectId: Joi.string().uuid().required(),
  assignedToId: Joi.string().uuid().optional(),
  dueDate: Joi.date().iso().required(),
  status: Joi.string().valid('todo', 'in-progress', 'done', 'blocked').default('todo'),
  priority: Joi.string().valid('low', 'medium', 'high').default('medium')
});

export const updateTaskSchema = Joi.object({
  title: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  assignedToId: Joi.string().uuid().optional().allow(null),
  dueDate: Joi.date().iso().optional(),
  status: Joi.string().valid('todo', 'in-progress', 'done', 'blocked').optional(),
  priority: Joi.string().valid('low', 'medium', 'high').optional()
});
```