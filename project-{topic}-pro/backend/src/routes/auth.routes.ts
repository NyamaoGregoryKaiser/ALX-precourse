```typescript
import { Router } from 'express';
import authController from '@controllers/auth.controller';
import { validate } from '@middleware/validate.middleware';
import { registerSchema, loginSchema } from '@utils/validationSchemas';
import { apiRateLimiter } from '@middleware/rateLimit.middleware';

const router = Router();

router.post('/register', apiRateLimiter, validate(registerSchema), authController.register);
router.post('/login', apiRateLimiter, validate(loginSchema), authController.login);
router.post('/refresh-token', apiRateLimiter, authController.refreshToken); // Refresh token endpoint might have different rate limit requirements
router.post('/logout', authController.logout); // Logout usually doesn't require auth

export default router;
```