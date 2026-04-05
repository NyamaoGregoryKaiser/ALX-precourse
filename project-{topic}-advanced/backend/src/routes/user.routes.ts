```typescript
import { Router } from 'express';
import { AppDataSource } from '../database/data-source';
import { UserController } from '../services/user.service';
import { UserRepository } from '../repositories/User.repository';
import { authenticate, authorize, AuthRequest } from '../middleware/auth.middleware';
import { UserRole } from '../entities/User.entity';
import { idSchema, validate } from '../middleware/validation.middleware';
import Joi from 'joi';

const router = Router();
const userRepository = new UserRepository(AppDataSource.getRepository(User));
const userController = new UserController(userRepository);

// Schemas for validation
const createUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid(UserRole.USER, UserRole.ADMIN).optional().default(UserRole.USER),
});

const updateUserSchema = Joi.object({
  username: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid(UserRole.USER, UserRole.ADMIN).optional(), // Admin can update role
});

// Admin-only route to get all users
router.get('/', authenticate, authorize([UserRole.ADMIN]), userController.getAllUsers.bind(userController));

// Get user profile (authenticated user or admin for any user)
router.get('/:id', authenticate, authorize([UserRole.ADMIN, UserRole.USER]), userController.getUserById.bind(userController));

// Update user (authenticated user for self, or admin for any user)
router.put('/:id', authenticate, authorize([UserRole.ADMIN, UserRole.USER]), validate(updateUserSchema), userController.updateUser.bind(userController));

// Delete user (authenticated user for self, or admin for any user)
router.delete('/:id', authenticate, authorize([UserRole.ADMIN, UserRole.USER]), userController.deleteUser.bind(userController));

export default router;
```