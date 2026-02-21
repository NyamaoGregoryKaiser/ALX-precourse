```typescript
import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { validate, loginSchema, registerSchema } from '../utils/joiValidation';
import { protect } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema, 'body'), authController.register);
router.post('/login', validate(loginSchema, 'body'), authController.login);
router.post('/refresh-token', authController.refreshAccessToken);
router.post('/logout', protect, authController.logout); // Logout usually involves client-side token deletion
router.get('/me', protect, authController.getMe);

export default router;
```