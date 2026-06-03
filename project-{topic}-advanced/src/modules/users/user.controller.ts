```typescript
import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import { HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';

export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id; // Authenticated user ID
    const user = await userService.getUserById(userId);

    res.status(HttpCode.OK).json({
      status: 'success',
      data: { user },
    });
  } catch (error: any) {
    logger.error(`Error getting user profile: ${error.message}`);
    next(error);
  }
};

export const updateUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const updateData = req.body;
    const updatedUser = await userService.updateUser(userId, updateData);

    res.status(HttpCode.OK).json({
      status: 'success',
      message: 'User profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (error: any) {
    logger.error(`Error updating user profile: ${error.message}`);
    next(error);
  }
};

export const deleteUserAccount = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    await userService.deleteUser(userId);

    res.status(HttpCode.NO_CONTENT).json({
      status: 'success',
      message: 'User account deleted successfully',
      data: null,
    });
  } catch (error: any) {
    logger.error(`Error deleting user account: ${error.message}`);
    next(error);
  }
};
```