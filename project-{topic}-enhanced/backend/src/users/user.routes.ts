```typescript
import { Router } from 'express';
import { userController } from './user.controller';
import { protect } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.use(protect); // All routes after this require authentication
router.use(apiRateLimiter); // Apply rate limiting to all user routes

router.get('/me', userController.getMe);
router.patch('/me', userController.updateMe); // Update own profile
router.get('/:id', userController.getUserById);
router.get('/', userController.getAllUsers);

export default router;
```