import Joi from 'joi';
import { TaskPriority, TaskStatus } from '../entities/Task';

const createTask = Joi.object({
  title: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).allow('', null),
  projectId: Joi.string().uuid().required(),
  assignedToId: Joi.string().uuid().allow(null).optional(),
  status: Joi.string().valid(...Object.values(TaskStatus)).default(TaskStatus.OPEN),
  priority: Joi.string().valid(...Object.values(TaskPriority)).default(TaskPriority.MEDIUM),
  dueDate: Joi.date().iso().allow(null).optional(),
});

const updateTask = Joi.object({
  title: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(1000).allow('', null).optional(),
  assignedToId: Joi.string().uuid().allow(null).optional(),
  status: Joi.string().valid(...Object.values(TaskStatus)).optional(),
  priority: Joi.string().valid(...Object.values(TaskPriority)).optional(),
  dueDate: Joi.date().iso().allow(null).optional(),
});

export const taskValidation = {
  createTask,
  updateTask,
};
```

#### `backend/src/middleware/validate.ts` (Joi validation middleware)
```typescript