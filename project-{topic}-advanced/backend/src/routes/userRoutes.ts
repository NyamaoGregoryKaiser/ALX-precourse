```typescript
import { Router } from 'express';
import {
  getUserProfile,
  updateMe,
  getAllUsers,
  getUserById,
  updateUserByAdmin,
  deleteUserByAdmin
} from '../controllers/userController';
import { protect, authorize } from '../middleware/authMiddleware';

const router = Router();

// User specific routes (authenticated users)
router.get('/me', protect, getUserProfile);
router.patch('/updateMe', protect, updateMe);

// Admin specific routes for user management
router.route('/')
  .get(protect, authorize('ADMIN'), getAllUsers); // Admin only

router.route('/:id')
  .get(protect, authorize('ADMIN'), getUserById) // Admin only
  .patch(protect, authorize('ADMIN'), updateUserByAdmin) // Admin only
  .delete(protect, authorize('ADMIN'), deleteUserByAdmin); // Admin only

export default router;
```