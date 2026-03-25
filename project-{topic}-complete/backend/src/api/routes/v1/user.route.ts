```typescript
import { Router } from 'express';
import userController from '../../controllers/user.controller';
import { authenticate } from '../../../middlewares/auth';
import validationMiddleware from '../../../middlewares/validate';
import { UpdateUserDto } from '../../validators/user.validation';

const router = Router();

router
  .route('/profile')
  .get(authenticate, userController.getProfile)
  .patch(authenticate, validationMiddleware(UpdateUserDto), userController.updateProfile);

export default router;
```