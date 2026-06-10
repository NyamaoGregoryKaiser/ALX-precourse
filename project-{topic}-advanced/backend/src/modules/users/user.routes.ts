```typescript
import { Router } from 'express';
import { userController } from './user.controller';
import { authenticateToken, authorizeRole } from '../../middleware/auth.middleware';
import { UserRole } from '../../database/entities/User';

const router = Router();

// Routes for authenticated users
router.get('/', authenticateToken, authorizeRole([UserRole.ADMIN]), userController.getAllUsers.bind(userController));
router.get('/:id', authenticateToken, userController.getUserById.bind(userController));
router.patch('/:id', authenticateToken, userController.updateUserDetails.bind(userController)); // PATCH for partial updates
router.delete('/:id', authenticateToken, authorizeRole([UserRole.ADMIN]), userController.deleteUser.bind(userController));

export default router;
```