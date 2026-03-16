import { Router } from 'express';
import { userController } from '../controllers/userController';
import { authorizeRoles } from '../middleware/authMiddleware';
import { UserRole } from '../db/entities/User';

const router = Router();

// Get current user's profile
router.get('/me', userController.getUserById); // user id from req.user
// Update current user's profile
router.put('/me', userController.updateCurrentUser);
// Delete current user's profile (requires a separate check to prevent admin self-deletion easily)
router.delete('/me', userController.deleteCurrentUser);

// Admin-only routes
router.get('/', authorizeRoles(UserRole.ADMIN), userController.getAllUsers);
router.get('/:id', authorizeRoles(UserRole.ADMIN), userController.getUserById);
router.put('/:id', authorizeRoles(UserRole.ADMIN), userController.updateUserById);
router.delete('/:id', authorizeRoles(UserRole.ADMIN), userController.deleteUserById);

export default router;