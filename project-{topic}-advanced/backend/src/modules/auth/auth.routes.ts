```typescript
import { Router } from 'express';
import { register, login, logout, getMe } from './auth.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { validate, registerSchema, loginSchema } from '../../utils/validation';
import { authRateLimiter } from '../../middleware/rateLimit.middleware';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema, 'body'), register);
router.post('/login', authRateLimiter, validate(loginSchema, 'body'), login);
router.post('/logout', authenticate, logout); // In a full system, logout would invalidate refresh tokens
router.get('/me', authenticate, getMe);

export default router;
```

#### `backend/src/modules/users/user.routes.ts`