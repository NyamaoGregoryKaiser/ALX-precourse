```typescript
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { userSchemas } from '../utils/validationSchemas';
import { UserRole } from '../entities/Role';

const router = Router();

// Admin only: Get all users
router.get(
  '/',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.getAllUsers
);

// Get specific user (user themselves or admin)
router.get(
  '/:userId',
  authenticate,
  validate(userSchemas.getUser),
  userController.getUser
);

// Update specific user (user themselves or admin). Admin can update roles.
router.patch(
  '/:userId',
  authenticate,
  validate(userSchemas.updateUser),
  userController.updateUser
);

// Delete specific user (admin only)
router.delete(
  '/:userId',
  authenticate,
  authorize([UserRole.ADMIN]),
  userController.deleteUser
);

// Change user's own password
router.patch(
  '/:userId/change-password',
  authenticate,
  validate(userSchemas.changePassword),
  userController.changePassword
);

export default router;
```