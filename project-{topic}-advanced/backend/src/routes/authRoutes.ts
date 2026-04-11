```typescript
import { Router } from 'express';
import { register, login, getMe } from '../controllers/authController';
import { protect, authorize } from '../middleware/authMiddleware';
import { loginRateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();

router.post('/register', register);
router.post('/login', loginRateLimit, login); // Apply stricter rate limiting to login
router.get('/me', protect, getMe);

export default router;
```