import express from 'express';
import userController from './user.controller.js';
import { protect, restrictTo } from '../auth/auth.middleware.js';
import { Role } from '@prisma/client';
import { invalidateCache, cacheMiddleware } from '../middleware/cache.js';

const router = express.Router();

// All user routes require authentication
router.use(protect);

// Routes for ADMIN only
router
  .route('/')
  .get(
    restrictTo(Role.ADMIN, Role.MANAGER),
    cacheMiddleware('users'), // Cache all users list
    userController.getAllUsers
  )
  .post(
    restrictTo(Role.ADMIN), // For creating users directly (if not using public registration)
    // Here we could add a validation schema for creating users by admin
    userController.createUser // Not implemented yet, assuming registration is the primary creation method
  );

router
  .route('/:id')
  .get(
    // A user can get their own profile, managers can get any user, admin can get any user
    (req, res, next) => {
      if (req.user.role === Role.ADMIN || req.user.role === Role.MANAGER || req.user.id === req.params.id) {
        return next();
      }
      return next(new AppError('You do not have permission to view this user profile.', 403));
    },
    cacheMiddleware('users'), // Cache single user profile
    userController.getUser
  )
  .patch(
    (req, res, next) => {
      // Users can update their own profiles. Admins/Managers can update others.
      if (req.user.role === Role.ADMIN || req.user.role === Role.MANAGER || req.user.id === req.params.id) {
        // Prevent users from changing their own role or another user's role
        if (req.body.role && (req.user.role !== Role.ADMIN && req.user.id !== req.params.id)) {
          return next(new AppError('You are not authorized to change user roles.', 403));
        }
        return next();
      }
      return next(new AppError('You do not have permission to update this user profile.', 403));
    },
    invalidateCache(['users']), // Invalidate user cache on update
    userController.updateUser
  )
  .delete(
    restrictTo(Role.ADMIN),
    invalidateCache(['users']), // Invalidate user cache on delete
    userController.deleteUser
  );

router
  .patch('/:id/assign-role',
    restrictTo(Role.ADMIN), // Only admin can assign roles
    invalidateCache(['users']),
    userController.assignRole
  );

export default router;
```

```javascript