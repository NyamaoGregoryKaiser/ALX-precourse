```typescript
import { Router } from 'express';
import * as taskController from './task.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';
import { TASK_STATUS } from '../../config/constants';

const createTaskSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters'),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional().nullable(), // ISO 8601 string
    categoryId: z.string().uuid('Invalid category ID format').optional().nullable(),
    status: z.enum([TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED])
      .default(TASK_STATUS.PENDING)
      .optional(),
  }),
});

const updateTaskSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
  body: z.object({
    title: z.string().min(1, 'Title is required').max(255, 'Title cannot exceed 255 characters').optional(),
    description: z.string().optional(),
    dueDate: z.string().datetime().optional().nullable(),
    categoryId: z.string().uuid('Invalid category ID format').optional().nullable(),
    status: z.enum([TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED])
      .optional(),
  }).partial(), // Allow partial updates
});

const getTaskByIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid task ID format'),
  }),
});

const getAllTasksSchema = z.object({
  query: z.object({
    status: z.enum([TASK_STATUS.PENDING, TASK_STATUS.IN_PROGRESS, TASK_STATUS.COMPLETED, TASK_STATUS.CANCELLED])
      .optional(),
    categoryId: z.string().uuid('Invalid category ID format').optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'dueDate', 'title', 'status']).default('createdAt').optional(),
    sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
    page: z.string().transform(Number).optional().default('1'),
    limit: z.string().transform(Number).optional().default('10'),
  }).partial(),
});


const router = Router();

router.use(authenticateToken); // All task routes require authentication

router.route('/')
  .post(validate(createTaskSchema), taskController.createTask)
  .get(validate(getAllTasksSchema), taskController.getAllTasks);

router.route('/:id')
  .get(validate(getTaskByIdSchema), taskController.getTaskById)
  .patch(validate(updateTaskSchema), taskController.updateTask)
  .delete(validate(getTaskByIdSchema), taskController.deleteTask);

export default router;
```

**Module Index (Aggregates Routes)**