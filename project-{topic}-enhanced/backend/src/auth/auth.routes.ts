```typescript
import { Router } from 'express';
import { authController } from './auth.controller';
import { protect } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/register', apiRateLimiter, authController.register);
router.post('/login', apiRateLimiter, authController.login);
router.post('/logout', protect, authController.logout); // Protect logout as well

export default router;
```