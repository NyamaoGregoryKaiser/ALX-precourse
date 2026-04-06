```typescript
import { Request, Response } from 'express';
import { UserService } from './user.service';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiError } from '../../utils/apiError';
import { updateUserSchema } from './user.validation';
import { UserRole } from '@prisma/client';
import { logger } from '../../utils/logger';

const userService = new UserService();

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }
  const user = await userService.getUserById(req.user.id);
  res.status(200).json(user);
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);
  res.status(200).json(user);
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;
  const { error, value } = updateUserSchema.validate(req.body);

  if (error) {
    throw new ApiError(400, error.details[0].message);
  }

  // A user can only update their own profile, unless they are an admin
  if (req.user.id !== id && req.user.role !== UserRole.ADMIN) {
    throw new ApiError(403, 'Unauthorized to update this user');
  }

  const updatedUser = await userService.updateUser(id, value);
  logger.info(`User ${id} updated by ${req.user.id}`);
  res.status(200).json(updatedUser);
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new ApiError(401, 'User not authenticated');
  }

  const { id } = req.params;

  // A user can only delete their own profile, unless they are an admin
  if (req.user.id !== id && req.user.role !== UserRole.ADMIN) {
    throw new ApiError(403, 'Unauthorized to delete this user');
  }

  if (req.user.role === UserRole.ADMIN && req.user.id === id) {
    throw new ApiError(400, 'Admin cannot delete their own account via this endpoint. Please use a super-admin interface or specific process.');
  }

  await userService.deleteUser(id);
  logger.warn(`User ${id} deleted by ${req.user.id}`);
  res.status(204).send(); // No content
});
```