import { Router } from 'express';
import {
  createTaskHandler,
  getAllTasksHandler,
  getTaskByIdHandler,
  updateTaskHandler,
  deleteTaskHandler,
} from './task.controller';
import { protect, restrictTo } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validationMiddleware';
import {
  createTaskSchema,
  getTaskByIdSchema,
  updateTaskSchema,
  deleteTaskSchema,
} from './task.validation';
import { Role } from '@prisma/client';
import { cacheMiddleware } from '../../middleware/cacheMiddleware';

const router = Router();

// Apply protection to all task routes
router.use(protect);
router.use(cacheMiddleware); // Apply caching to GET requests

router
  .route('/')
  .post(restrictTo(Role.ADMIN, Role.PROJECT_MANAGER), validate(createTaskSchema), createTaskHandler)
  .get(getAllTasksHandler); // Access controlled in controller based on role

router
  .route('/:id')
  .get(validate(getTaskByIdSchema), getTaskByIdHandler) // Access controlled in controller based on role
  .patch(validate(updateTaskSchema), updateTaskHandler) // Access controlled in controller based on role
  .delete(deleteTaskHandler); // Access controlled in controller based on role

export default router;
```