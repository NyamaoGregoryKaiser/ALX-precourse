import express from 'express';
import { userController } from '../../controllers/userController';
import { auth, authorize } from '../../middleware/auth';
import { UserRole } from '../../entities/User';
import validate from '../../middleware/validate';
import Joi from 'joi';
import { cacheMiddleware } from '../../middleware/cache';

const router = express.Router();

router.route('/')
  .get(auth, authorize([UserRole.ADMIN]), cacheMiddleware('users', 300), userController.getAllUsers);

router.route('/:userId')
  .get(auth, authorize([UserRole.ADMIN]), userController.getUserById)
  .patch(auth, authorize([UserRole.ADMIN]), validate(Joi.object({ role: Joi.string().valid(...Object.values(UserRole)).required() })), userController.updateUserRole);

export default router;
```

#### `backend/src/routes/v1/project.route.ts`
```typescript