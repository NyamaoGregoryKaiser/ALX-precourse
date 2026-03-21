```typescript
import { Request, Response, NextFunction } from 'express';
import userService from '@services/user.service';
import logger from '@config/logger';
import { UserRole } from '@models/User';

class UserController {
  async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      logger.error(`Get all users controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      res.status(200).json(user);
    } catch (error) {
      logger.error(`Get user by ID controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async updateUserRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!Object.values(UserRole).includes(role)) {
        return res.status(400).json({ message: `Invalid role: ${role}` });
      }

      const updatedUser = await userService.updateUserRole(id, role as UserRole);
      res.status(200).json({
        message: `User ${updatedUser.username}'s role updated to ${updatedUser.role}`,
        user: { id: updatedUser.id, username: updatedUser.username, email: updatedUser.email, role: updatedUser.role }
      });
    } catch (error) {
      logger.error(`Update user role controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await userService.deleteUser(id);
      res.status(204).send(); // No content
    } catch (error) {
      logger.error(`Delete user controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }
}

export default new UserController();
```