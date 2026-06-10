```typescript
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { UpdateUserDto } from './user.dtos';
import { validate } from '../../shared/validators/joi.validator';
import { updateUserSchema } from './user.validation';
import { logger } from '../../shared/utils/logger';
import { CustomError } from '../../shared/errors/CustomError';

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Get all users (Admin only)
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // Query optimization: only select necessary fields, use pagination in real apps
      const users = await this.userService.findAll();
      res.status(200).json(users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })));
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);
      if (!user) {
        throw new CustomError('User not found', 404);
      }
      res.status(200).json({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update user details (can be self or Admin for any user)
   */
  async updateUserDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUser = req.user!; // Authenticated user
      
      // Authorization check: User can only update their own profile unless they are an ADMIN
      if (currentUser.id !== id && currentUser.role !== 'ADMIN') {
        throw new CustomError('Forbidden: You can only update your own profile', 403);
      }

      const { error, value } = validate(req.body, updateUserSchema);
      if (error) {
        return res.status(400).json({ message: 'Validation failed', errors: error.details });
      }
      const updateData: UpdateUserDto = value;

      const updatedUser = await this.userService.update(id, updateData);
      logger.info(`User ${id} updated by ${currentUser.email}`);
      res.status(200).json({
        message: 'User updated successfully',
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          role: updatedUser.role,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const currentUser = req.user!; // Authenticated user

      // Prevent admin from deleting themselves
      if (currentUser.id === id) {
        throw new CustomError('Forbidden: You cannot delete your own admin account', 403);
      }

      await this.userService.delete(id);
      logger.info(`User ${id} deleted by admin ${currentUser.email}`);
      res.status(204).send(); // No content
    } catch (error) {
      next(error);
    }
  }
}

const userService = new UserService();
export const userController = new UserController(userService);
```