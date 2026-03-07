```typescript
import { Router } from 'express';
import { register, login, refresh, logout, getMe } from '../controllers/auth.controller';
import { validateRequest } from '../middleware/validation.middleware';
import { RegisterDto, LoginDto } from '../controllers/dtos/auth.dto';
import { protect } from '../middleware/auth.middleware';
import { apiRateLimiter } from '../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', apiRateLimiter, validateRequest(RegisterDto), register);
router.post('/login', apiRateLimiter, validateRequest(LoginDto), login);
router.post('/refresh', apiRateLimiter, refresh); // Refresh token comes from cookie
router.post('/logout', apiRateLimiter, protect, logout);
router.get('/me', protect, getMe);

export default router;
```