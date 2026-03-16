import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import { CustomError } from '../middleware/errorHandler';

class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers(req.user!.role);
      res.status(200).json(users);
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await userService.getUserById(req.params.id, req.user!.id, req.user!.role);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  async updateCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedUser = await userService.updateUser(req.user!.id, req.user!.id, req.user!.role, req.body);
      res.status(200).json({
        message: 'Profile updated successfully',
        user: { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, role: updatedUser.role },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUserById(req: Request, res: Response, next: NextFunction) {
    try {
      // Admin can update any user, but cannot change own role or delete self
      const updatedUser = await userService.updateUser(req.params.id, req.user!.id, req.user!.role, req.body);
      res.status(200).json({
        message: 'User updated successfully',
        user: { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, role: updatedUser.role },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteCurrentUser(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.id === req.params.id) { // Self-deletion check
          if (req.user!.role === 'admin') {
              throw new CustomError('Admin cannot delete their own account via this endpoint. Please contact support.', 403);
          }
          const result = await userService.deleteUser(req.user!.id, req.user!.id, req.user!.role);
          res.status(200).json(result);
      } else {
          throw new CustomError('Forbidden: You can only delete your own account via this endpoint', 403);
      }
    } catch (error) {
      next(error);
    }
  }

  async deleteUserById(req: Request, res: Response, next: NextFunction) {
    try {
      if (req.user!.id === req.params.id) {
          throw new CustomError('Forbidden: Admin cannot delete their own account via this endpoint. Use specific self-delete for non-admins or contact support.', 403);
      }
      const result = await userService.deleteUser(req.params.id, req.user!.id, req.user!.role);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();