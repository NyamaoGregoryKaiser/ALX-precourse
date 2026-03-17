```typescript
import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { UserService } from '../services/UserService';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { authenticateToken, authorizeRoles } from '../middleware/auth.middleware';
import { CacheService } from '../services/CacheService';
import { appCache } from '../config/cache';

/**
 * @file User management routes.
 *
 * Defines the API endpoints for managing user accounts.
 * These routes require authentication and, for some, authorization (admin role).
 */

const router = Router();
const userRepository = AppDataSource.getRepository(User);
const cacheService = new CacheService(appCache);
const userService = new UserService(userRepository, cacheService);
const userController = new UserController(userService);

// Apply authentication middleware to all user routes
router.use(authenticateToken);

router.get('/', authorizeRoles(['admin']), (req, res, next) => userController.getAllUsers(req, res, next));
router.get('/:id', (req, res, next) => userController.getUserById(req, res, next)); // User can view own, admin can view all
router.put('/:id', (req, res, next) => userController.updateUser(req, res, next)); // User can update own, admin can update all
router.delete('/:id', (req, res, next) => userController.deleteUser(req, res, next)); // User can delete own, admin can delete all

export default router;
```