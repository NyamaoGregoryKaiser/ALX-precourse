import { Router } from 'express';
import {
  createUserHandler,
  getAllUsersHandler,
  getUserByIdHandler,
  updateUserHandler,
  deleteUserHandler,
} from './user.controller';
import { protect, restrictTo } from '../../middleware/authMiddleware';
import { validate } from '../../middleware/validationMiddleware';
import {
  createUserSchema,
  getUserByIdSchema,
  updateUserSchema,
  deleteUserSchema,
} from './user.validation';
import { Role } from '@prisma/client';
import { cacheMiddleware } from '../../middleware/cacheMiddleware';

const router = Router();

// Apply protection to all user routes
router.use(protect);
router.use(cacheMiddleware); // Apply caching to GET requests

// ADMIN-only routes
router
  .route('/')
  .post(restrictTo(Role.ADMIN), validate(createUserSchema), createUserHandler)
  .get(restrictTo(Role.ADMIN), getAllUsersHandler);

// Admin or Self-access routes
router
  .route('/:id')
  .get(validate(getUserByIdSchema), getUserByIdHandler) // Admin can get any, user can get self
  .patch(validate(updateUserSchema), updateUserHandler) // Admin can update any, user can update self (non-role fields)
  .delete(restrictTo(Role.ADMIN), validate(deleteUserSchema), deleteUserHandler); // Only Admin can delete

export default router;
```