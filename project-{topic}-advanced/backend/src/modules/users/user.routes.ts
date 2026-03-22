```typescript
import { Router } from 'express';
import { getAllUsers, getUserById, updateUser, deleteUser } from './user.controller';
import { authenticate, authorize } from '../../middleware/auth.middleware';
import { UserRole } from '../../entities/User';
import { validate } from '../../utils/validation';
import * as yup from 'yup';

const router = Router();

// Validation schema for user ID parameter
const userIdParamSchema = yup.object({
  params: yup.object({
    id: yup.string().uuid('Invalid user ID format').required('User ID is required'),
  }).required(),
});

// Validation schema for updating user (email and role)
const updateUserBodySchema = yup.object({
  body: yup.object({
    email: yup.string().email('Invalid email format').optional(),
    role: yup.string().oneOf(Object.values(UserRole)).optional(),
  }).required(),
});

router.route('/')
  .get(authenticate, authorize([UserRole.ADMIN]), getAllUsers); // Only admin can list all users

router.route('/:id')
  .get(authenticate, validate(userIdParamSchema, 'params'), getUserById) // User can get their own, admin can get any
  .put(authenticate, validate(userIdParamSchema, 'params'), validate(updateUserBodySchema, 'body'), updateUser) // User can update their own, admin can update any
  .delete(authenticate, authorize([UserRole.ADMIN]), validate(userIdParamSchema, 'params'), deleteUser); // Only admin can delete users

export default router;
```

#### `backend/src/modules/databases/database.routes.ts`