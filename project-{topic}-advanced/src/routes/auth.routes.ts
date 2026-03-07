```typescript
import { Router } from 'express';
import { register, login, getMe } from '../controllers/auth.controller';
import { validate, registerSchema, loginSchema } from '../utils/validation.utils';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/me', authenticateToken, getMe);

export default router;
```