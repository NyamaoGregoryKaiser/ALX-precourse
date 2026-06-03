```typescript
import { Router } from 'express';
import * as userController from './user.controller';
import { authenticateToken } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validation.middleware';
import { z } from 'zod';

const updateUserSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name cannot be empty').optional(),
    email: z.string().email('Invalid email address').optional(),
    password: z.string().min(8, 'Password must be at least 8 characters long').optional(),
  }).partial(), // Allow partial updates
});

const router = Router();

router.use(authenticateToken); // All routes below require authentication

router.get('/me', userController.getUserProfile);
router.patch('/me', validate(updateUserSchema), userController.updateUserProfile);
router.delete('/me', userController.deleteUserAccount);

export default router;
```

**Module: Categories**