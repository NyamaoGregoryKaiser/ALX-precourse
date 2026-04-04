```typescript
import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validate, authValidation } from '../middlewares/validation';

const router = Router();

router.post('/register', validate(authValidation.register, 'body'), authController.register);
router.post('/login', validate(authValidation.login, 'body'), authController.login);
// A logout typically handled client-side by removing token, but could have a server-side equivalent
// router.post('/logout', authenticateToken, authController.logout);

export default router;
```