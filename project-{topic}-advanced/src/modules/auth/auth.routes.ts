```typescript
import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validation.middleware';
import { authRateLimiter } from '../../middleware/rate-limit.middleware';
import { z } from 'zod';

// Define Zod schemas for validation
const registerSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'), // Password length checked by service
  }),
});

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), authController.register);
router.post('/login', authRateLimiter, validate(loginSchema), authController.login);
router.post('/logout', authController.logout); // No auth needed for logout if it just clears a cookie
// router.post('/refresh-token', authController.refreshAccessToken);

export default router;
```

**Module: Users** (Basic management, could be expanded for admin roles)