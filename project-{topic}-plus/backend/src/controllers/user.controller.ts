```typescript
import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/user.service';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';

class UserController {
  async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not authenticated.');
      }
      // req.user already contains the authenticated user data from middleware
      const user = await userService.getUserById(req.user.id); // Re-fetch to ensure latest data or for specific fields
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found.');
      }
      res.status(httpStatus.OK).json({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        status: user.status
      });
    } catch (error) {
      next(error);
    }
  }

  async getUserById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
      }
      res.status(httpStatus.OK).json({
        id: user.id,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        status: user.status
      });
    } catch (error) {
      next(error);
    }
  }

  async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const { q } = req.query;
      const users = await userService.searchUsers(q as string);
      res.status(httpStatus.OK).json(users.map(user => ({
        id: user.id,
        username: user.username,
        email: user.email,
        status: user.status
      })));
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();
```