```typescript
import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/UserService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { z } from 'zod';

/**
 * @file User controller.
 *
 * This controller handles requests related to user management,
 * interacting with the `UserService` for CRUD operations.
 */

// Zod schemas for validation
const userUpdateSchema = z.object({
  username: z.string().min(3).max(50).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export class UserController {
  constructor(private userService: UserService) {}

  /**
   * Gets all users (admin only).
   * @route GET /api/users
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getAllUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const users = await this.userService.findAll();
      logger.info('Fetched all users.');
      res.status(200).json({ status: 'success', data: users });
    } catch (error: any) {
      logger.error(`Error fetching all users: ${error.message}`);
      next(error);
    }
  }

  /**
   * Gets a user by ID.
   * @route GET /api/users/:id
   * @param {Request} req - The Express request object with user ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.findById(id);
      if (!user) {
        return next(new AppError('User not found', 404));
      }
      // Ensure only own user or admin can see full user details
      if (req.user!.id !== id && req.user!.role !== 'admin') {
        return next(new AppError('Forbidden: You can only view your own user profile', 403));
      }
      logger.info(`Fetched user with ID: ${id}`);
      res.status(200).json({ status: 'success', data: user });
    } catch (error: any) {
      logger.error(`Error fetching user by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Updates a user by ID.
   * @route PUT /api/users/:id
   * @param {Request} req - The Express request object with user ID in params and update data in body.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = userUpdateSchema.parse(req.body);

      // A user can only update their own profile, unless they are an admin
      if (req.user!.id !== id && req.user!.role !== 'admin') {
        return next(new AppError('Forbidden: You can only update your own user profile', 403));
      }

      // Prevent non-admin users from changing their role
      if (req.user!.role !== 'admin' && updateData.role) {
        return next(new AppError('Forbidden: You cannot change your own role', 403));
      }

      const updatedUser = await this.userService.update(id, updateData);
      if (!updatedUser) {
        return next(new AppError('User not found or no changes made', 404));
      }
      logger.info(`User updated with ID: ${id}`);
      res.status(200).json({ status: 'success', message: 'User updated successfully', data: updatedUser });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      logger.error(`Error updating user by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Deletes a user by ID.
   * @route DELETE /api/users/:id
   * @param {Request} req - The Express request object with user ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;

      // A user can only delete their own profile, unless they are an admin
      if (req.user!.id !== id && req.user!.role !== 'admin') {
        return next(new AppError('Forbidden: You can only delete your own user profile', 403));
      }

      const deleted = await this.userService.delete(id);
      if (!deleted) {
        return next(new AppError('User not found', 404));
      }
      logger.info(`User deleted with ID: ${id}`);
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error: any) {
      logger.error(`Error deleting user by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }
}
```