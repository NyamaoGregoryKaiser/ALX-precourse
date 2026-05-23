import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import asyncHandler from '../../../utils/asyncHandler';
import { SuccessResponse } from '../../../utils/apiResponse';

export const getAllUsers = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const users = await userService.findAllUsers();
  new SuccessResponse(res, 'Users retrieved successfully', users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
  }))).send();
});

// Other user controllers could go here (e.g., getUserProfile, updateUserProfile)
```