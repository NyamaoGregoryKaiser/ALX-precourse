```typescript
import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import catchAsync from '../../utils/catchAsync';
import userService from '../../services/userService';
import { AuthenticatedRequest } from '../../types';
import { UpdateUserDto } from '../validators/user.validation';
import ApiError from '../../utils/ApiError';

const getProfile = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  // Exclude sensitive information like password
  const { password, ...userWithoutPassword } = req.user;
  res.status(StatusCodes.OK).send(userWithoutPassword);
});

const updateProfile = catchAsync(async (req: AuthenticatedRequest<any, any, UpdateUserDto>, res: Response) => {
  if (!req.user) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not authenticated');
  }
  const updatedUser = await userService.updateUserById(req.user.id, req.body);
  if (!updatedUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  const { password, ...userWithoutPassword } = updatedUser;
  res.status(StatusCodes.OK).send(userWithoutPassword);
});

// Admin-only functions could be added for listing/managing all users
// const getUsers = catchAsync(async (req: AuthenticatedRequest, res: Response) => {
//   const users = await userService.queryUsers(); // Implement a query function in userService
//   res.status(StatusCodes.OK).send(users.map(u => { const { password, ...rest } = u; return rest; }));
// });

export default {
  getProfile,
  updateProfile,
};
```