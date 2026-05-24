import express from 'express';
import authController from './auth.controller.js';
import { register, login, validate } from './auth.validation.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/register', validate(register, 'body'), authController.register);
router.post('/login', validate(login, 'body'), authLimiter, authController.login);
router.post('/refresh-tokens', authController.refreshTokens);
router.post('/logout', authController.logout); // Logout requires refresh token

export default router;
```

```javascript