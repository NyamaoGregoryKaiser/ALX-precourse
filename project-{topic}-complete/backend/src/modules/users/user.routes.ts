```typescript
import { Router } from 'express';
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changePassword,
  updateUserRole,
  validate,
  createUserSchema,
  updateUserSchema,
  changePasswordSchema
} from './user.controller';
import { protect, authorize } from '../../middleware/authMiddleware';
import { UserRole } from './user.entity';

const router = Router();

// Routes for authenticated users
router.use(protect); // All routes below this line require authentication

// Admin specific routes
router
  .route('/')
  .get(authorize(UserRole.ADMIN), getAllUsers) // Admin can get all users
  .post(authorize(UserRole.ADMIN), validate(createUserSchema), createUser); // Admin can create users

router
  .route('/:id')
  .get(authorize(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), getUserById) // Admin or user themselves
  .put(authorize(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), validate(updateUserSchema), updateUser) // Admin or user themselves
  .delete(authorize(UserRole.ADMIN), deleteUser); // Admin can delete users

// Specific actions
router.patch('/change-password/:id', authorize(UserRole.ADMIN, UserRole.CUSTOMER, UserRole.SELLER), validate(changePasswordSchema), changePassword);
router.patch('/update-role/:id', authorize(UserRole.ADMIN), updateUserRole); // Only admin can update roles

export default router;
```