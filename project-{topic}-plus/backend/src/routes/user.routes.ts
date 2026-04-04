```typescript
import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticateToken } from '../middlewares/auth';
import { validate, userValidation } from '../middlewares/validation';

const router = Router();

router.use(authenticateToken); // All user routes require authentication

router.get('/me', userController.getMe);
router.get('/search', validate(userValidation.searchUsers, 'query'), userController.searchUsers);
router.get('/:id', validate(userValidation.getUserById, 'params'), userController.getUserById);

export default router;
```