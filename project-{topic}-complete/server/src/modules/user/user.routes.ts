import { Router } from 'express';
import * as userController from './user.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth.middleware';
import { apiRateLimiter } from '../../middlewares/rateLimit.middleware';
import { cacheMiddleware } from '../../middlewares/cache.middleware';
import config from '../../config';

const router = Router();

// Apply rate limiting to all user routes
router.use(apiRateLimiter);

// Protected routes (require authentication)
router.use(authMiddleware);

// Admin-only route for getting all users
router.get('/', authorizeRoles(['ADMIN']), cacheMiddleware({ keyPrefix: 'users', ttlSeconds: config.cacheTtlUsers }), userController.getAllUsers);

// Get a specific user by ID (Admin or owner)
router.get('/:id', userController.getUserById);

// Update a user (Admin or owner)
router.patch('/:id', userController.updateUser);

// Delete a user (Admin or owner)
router.delete('/:id', userController.deleteUser);

export default router;