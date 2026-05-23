import { Router } from 'express';
import { authorizeMiddleware } from '../../../middleware/authMiddleware';
import * as userController from '../controllers/userController';

const router = Router();

// Example protected route for admin users
router.get('/', authorizeMiddleware('admin'), userController.getAllUsers);
// Add other user-related routes (e.g., get self, update self) if needed

export default router;
```