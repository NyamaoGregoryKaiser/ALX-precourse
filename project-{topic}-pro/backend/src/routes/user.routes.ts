```typescript
import { Router } from 'express';
import userController from '@controllers/user.controller';
import { authenticate } from '@middleware/auth.middleware';
import { authorize } from '@middleware/authorize.middleware';
import { UserRole } from '@models/User';
import { validate } from '@middleware/validate.middleware';
import Joi from 'joi';

const router = Router();

// Only Admins can manage users
router.use(authenticate);
router.use(authorize([UserRole.ADMIN]));

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.put('/:id/role', validate(Joi.object({ role: Joi.string().valid(...Object.values(UserRole)).required() })), userController.updateUserRole);
router.delete('/:id', userController.deleteUser);

export default router;
```