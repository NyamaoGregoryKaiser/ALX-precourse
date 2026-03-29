import { Router } from 'express';
import * as userController from './user.controller';
import userValidation from './user.validation';
import { validate } from '@/middlewares/validation.middleware';
import { authenticate, authorize, authorizeRoles } from '@/middlewares/auth.middleware';

const router = Router();

// Routes for managing all users (admin-only)
router.route('/')
  .post(authenticate, authorize(['user:write', 'admin:access']), validate(userValidation.createUser), userController.createUser)
  .get(authenticate, authorize(['user:read', 'admin:access']), userController.getUsers);

router.route('/:userId')
  .get(authenticate, authorize(['user:read', 'admin:access']), validate(userValidation.getUser), userController.getUser)
  .patch(authenticate, authorize(['user:write', 'admin:access']), validate(userValidation.updateUser), userController.updateUser)
  .delete(authenticate, authorize(['user:delete', 'admin:access']), validate(userValidation.deleteUser), userController.deleteUser);

// Routes for current authenticated user's profile
router.route('/me')
  .get(authenticate, userController.getCurrentUserProfile)
  .patch(authenticate, userController.updateCurrentUserProfile); // Only update basic fields, not roles/permissions

export default router;