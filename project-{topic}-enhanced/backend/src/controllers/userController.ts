import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService';
import httpStatus from 'http-status';
import { catchAsync } from '../utils/catchAsync';
import { UserRole } from '../entities/User';
import { ApiError } from '../utils/ApiError';

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  const safeUsers = users.map(user => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }));
  res.send(safeUsers);
});

const getUserById = catchAsync(async (req: Request, res: Response) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  });
});

const updateUserRole = catchAsync(async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!Object.values(UserRole).includes(role)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role provided');
  }

  const updatedUser = await userService.updateUserRole(userId, role);
  res.send({
    id: updatedUser.id,
    email: updatedUser.email,
    firstName: updatedUser.firstName,
    lastName: updatedUser.lastName,
    role: updatedUser.role,
  });
});

export const userController = {
  getAllUsers,
  getUserById,
  updateUserRole,
};
```

#### `backend/src/controllers/projectController.ts`
```typescript