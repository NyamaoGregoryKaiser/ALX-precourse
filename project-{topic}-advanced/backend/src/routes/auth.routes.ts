```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authRateLimiter, authenticate } from '../middlewares/auth.middleware';
import validate from '../middlewares/validation.middleware';
import { authSchemas } from '../utils/validationSchemas';

const router = Router();

router.post('/register', authRateLimiter, validate(authSchemas.register), authController.register);
router.post('/login', authRateLimiter, validate(authSchemas.login), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/refresh-tokens', validate(authSchemas.refreshTokens), authController.refreshTokens);
router.post('/forgot-password', validate(authSchemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authSchemas.resetPassword), authController.resetPassword);
router.get('/verify-email', validate(authSchemas.verifyEmail), authController.verifyEmail);
router.post('/resend-verification', validate(authSchemas.forgotPassword), authController.resendVerificationEmail); // Reusing schema for email field

export default router;
```