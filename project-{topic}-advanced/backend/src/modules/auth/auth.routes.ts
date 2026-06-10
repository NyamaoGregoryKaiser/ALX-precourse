```typescript
import { Router } from 'express';
import { authController } from './auth.controller';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { authenticateToken } from '../../middleware/auth.middleware';

const router = Router();

// Apply a specific rate limiter for auth routes
router.post('/register', authRateLimiter, authController.register.bind(authController));
router.post('/login', authRateLimiter, authController.login.bind(authController));
router.post('/refresh-token', authRateLimiter, authController.refreshToken.bind(authController));

// Logout requires authentication to identify the user whose token to revoke
router.post('/logout', authenticateToken, authController.logout.bind(authController));

export default router;
```