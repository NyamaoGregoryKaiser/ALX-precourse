```typescript
import { Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import { userService } from './user.service';
import { AuthenticatedRequest } from '../types';

class UserController {
  async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      const user = await userService.getUserById(req.user.id);
      res.status(StatusCodes.OK).json({ status: 'success', data: { user } });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      res.status(StatusCodes.OK).json({ status: 'success', data: { user } });
    } catch (error) {
      next(error);
    }
  }

  async getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const users = await userService.getAllUsers();
      res.status(StatusCodes.OK).json({ status: 'success', data: { users } });
    } catch (error) {
      next(error);
    }
  }

  async updateMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return res.status(StatusCodes.UNAUTHORIZED).json({ status: 'fail', message: 'Not authenticated' });
      }
      const { username, email } = req.body;
      const updatedUser = await userService.updateUserProfile(req.user.id, { username, email });
      res.status(StatusCodes.OK).json({ status: 'success', message: 'Profile updated successfully', data: { user: updatedUser } });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
```