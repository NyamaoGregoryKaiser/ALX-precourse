import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import { CustomError } from '../../middlewares/error.middleware';
import { invalidateCache } from '../../middlewares/cache.middleware';

export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      throw new CustomError('User not found.', 404);
    }
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!req.user || (req.user.userId !== id && req.user.role !== 'ADMIN')) {
      throw new CustomError('Forbidden: You can only update your own profile or require Admin privileges.', 403);
    }

    const updatedUser = await userService.updateUser(id, updateData);
    if (!updatedUser) {
      throw new CustomError('User not found.', 404);
    }
    await invalidateCache('users'); // Invalidate users cache
    res.status(200).json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user || (req.user.userId !== id && req.user.role !== 'ADMIN')) {
      throw new CustomError('Forbidden: You can only delete your own profile or require Admin privileges.', 403);
    }

    const deletedUser = await userService.deleteUser(id);
    if (!deletedUser) {
      throw new CustomError('User not found.', 404);
    }
    await invalidateCache('users'); // Invalidate users cache
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};