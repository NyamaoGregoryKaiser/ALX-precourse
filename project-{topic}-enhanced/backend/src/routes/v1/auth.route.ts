import express from 'express';
import { authController } from '../../controllers/authController';
import { authRateLimiter } from '../../middleware/rateLimiter';
import validate from '../../middleware/validate';
import { authValidation } from '../../validation/auth.validation';
import { auth } from '../../middleware/auth';

const router = express.Router();

router.post('/register', authRateLimiter, validate(authValidation.register), authController.register);
router.post('/login', authRateLimiter, validate(authValidation.login), authController.login);
router.get('/me', auth, authController.getMe);

export default router;
```

#### `backend/src/routes/v1/user.route.ts`
```typescript