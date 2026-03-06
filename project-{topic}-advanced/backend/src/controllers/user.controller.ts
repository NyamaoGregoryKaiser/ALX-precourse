```typescript
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import { logger } from '../utils/logger';

class UserController {
  // Admin only: Get all users
  public async getAllUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers();
      // Filter sensitive info before sending
      const usersWithoutPasswords = users.map(user => {
        const { password, ...rest } = user;
        return { ...rest, role: user.role.name }; // Include role name
      });
      res.status(200).json(usersWithoutPasswords);
    } catch (error) {
      next(error);
    }
  }

  // Get a single user by ID (accessible by user themselves or admin)
  public async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const user = await userService.getUserById(userId);

      // Authorization check: User can only view their own profile unless they are admin
      if (req.user?.id !== userId && req.user?.role.name !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: You can only view your own profile.' });
      }

      const { password, ...rest } = user;
      res.status(200).json({ ...rest, role: user.role.name });
    } catch (error) {
      next(error);
    }
  }

  // Update a user by ID (accessible by user themselves or admin)
  public async updateUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const updatedUser = await userService.updateUser(userId, req.body, req.user!.id, req.user!.role.name);
      const { password, ...rest } = updatedUser;
      res.status(200).json({ message: 'User updated successfully.', user: { ...rest, role: updatedUser.role.name } });
    } catch (error) {
      next(error);
    }
  }

  // Delete a user by ID (admin only)
  public async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      await userService.deleteUser(userId, req.user!.id, req.user!.role.name);
      res.status(200).json({ message: 'User deleted successfully.' });
    } catch (error) {
      next(error);
    }
  }

  // Change user's own password
  public async changePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const { currentPassword, newPassword } = req.body;

      // Ensure the user is changing their own password
      if (req.user?.id !== userId) {
        return res.status(403).json({ message: 'Forbidden: You can only change your own password.' });
      }

      await userService.changePassword(userId, currentPassword, newPassword, req.user!.id);
      res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
```