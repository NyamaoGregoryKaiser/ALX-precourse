import { Router } from 'express';
import {
  createProjectHandler,
  getAllProjectsHandler,
  getProjectByIdHandler,
  updateProjectHandler,
  deleteProjectHandler,
} from './project.controller';
import { protect, restrictTo } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validationMiddleware';
import {
  createProjectSchema,
  getProjectByIdSchema,
  updateProjectSchema,
  deleteProjectSchema,
} from './project.validation';
import { Role } from '@prisma/client';
import { cacheMiddleware } from '../../middleware/cacheMiddleware';

const router = Router();

// Apply protection to all project routes
router.use(protect);
router.use(cacheMiddleware); // Apply caching to GET requests

router
  .route('/')
  .post(restrictTo(Role.ADMIN, Role.PROJECT_MANAGER), validate(createProjectSchema), createProjectHandler)
  .get(getAllProjectsHandler); // Access controlled in controller based on role

router
  .route('/:id')
  .get(validate(getProjectByIdSchema), getProjectByIdHandler) // Access controlled in controller based on role
  .patch(validate(updateProjectSchema), updateProjectHandler) // Access controlled in controller based on role
  .delete(deleteProjectHandler); // Access controlled in controller based on role

export default router;
```