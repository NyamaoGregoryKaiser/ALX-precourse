import Joi from 'joi';

const createProject = Joi.object({
  name: Joi.string().min(3).max(255).required(),
  description: Joi.string().max(1000).allow('', null),
});

const updateProject = Joi.object({
  name: Joi.string().min(3).max(255).optional(),
  description: Joi.string().max(1000).allow('', null).optional(),
});

export const projectValidation = {
  createProject,
  updateProject,
};
```

#### `backend/src/validation/task.validation.ts`
```typescript