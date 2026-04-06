```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middlewares/auth.middleware';
import { getCurrentUser, getUserById, updateUser, deleteUser } from './user.controller';
import { UserRole } from '@prisma/client';

const router = Router();

// Routes for authenticated users
router.use(authenticate); // All routes below require authentication

router.get('/me', getCurrentUser);
router.get('/:id', authorize([UserRole.ADMIN, UserRole.USER]), getUserById); // Users can view any user if authorized
router.put('/:id', authorize([UserRole.ADMIN, UserRole.USER]), updateUser); // Users can update themselves, admin any user
router.delete('/:id', authorize([UserRole.ADMIN, UserRole.USER]), deleteUser); // Users can delete themselves, admin any user

export default router;
```