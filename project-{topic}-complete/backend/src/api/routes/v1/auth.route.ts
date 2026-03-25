```typescript
import { Router } from 'express';
import authController from '../../controllers/auth.controller';
import validationMiddleware from '../../../middlewares/validate';
import { RegisterUserDto, LoginUserDto, RefreshTokenDto } from '../../validators/auth.validation';
import rateLimiter from '../../../middlewares/rateLimiter';

const router = Router();

router.post('/register', validationMiddleware(RegisterUserDto), authController.register);
router.post('/login', validationMiddleware(LoginUserDto), rateLimiter, authController.login);
router.post('/logout', validationMiddleware(RefreshTokenDto), authController.logout); // Logout doesn't need to be rate-limited
router.post('/refresh-tokens', validationMiddleware(RefreshTokenDto), authController.refreshTokens);

export default router;
```