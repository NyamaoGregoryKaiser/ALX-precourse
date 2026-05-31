import { Router } from 'express';
import { registerHandler, loginHandler } from './auth.controller';
import { validate } from '../../middleware/validationMiddleware';
import { registerSchema, loginSchema } from './auth.validation';
import { guestRateLimiter, loginRateLimiter } from '../../middleware/rateLimiter';

const router = Router();

// Apply guest rate limiter to all auth routes
router.use(guestRateLimiter);

router.post('/register', validate(registerSchema), registerHandler);
router.post('/login', loginRateLimiter, validate(loginSchema), loginHandler); // Specific login rate limiter

export default router;
```