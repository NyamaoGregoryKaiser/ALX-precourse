```typescript
import { Router } from 'express';
import { AuthController } from './auth.controller';
import { protect } from '../../middleware/auth';
import { authRateLimiter } from '../../middleware/rateLimiting';

const router = Router();
const authController = new AuthController();

router.post('/register', authRateLimiter, authController.register);
router.post('/login', authRateLimiter, authController.login);
router.get('/me', protect, authController.getMe);

export default router;
```