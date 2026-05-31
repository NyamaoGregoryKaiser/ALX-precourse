import { Request, Response, NextFunction } from 'express';
import { StatusCodes } from 'http-status-codes';
import * as userService from './user.service';
import { AppError } from '../../utils/appError';

/**
 * Handles creation of a new user.
 * Accessible by ADMIN.
 */
export const createUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userData = req.body;
    const newUser = await userService.createUser(userData);
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: { user: newUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles retrieval of all users.
 * Accessible by ADMIN.
 */
export const getAllUsersHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getAllUsers();
    res.status(StatusCodes.OK).json({
      status: 'success',
      results: users.length,
      data: { users },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles retrieval of a single user by ID.
 * Accessible by ADMIN, or a user requesting their own profile.
 */
export const getUserByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // A user can fetch their own profile, otherwise ADMIN access is required.
    if (req.user?.id !== id && req.user?.role !== 'ADMIN') {
        return next(new AppError('You do not have permission to access this user profile.', StatusCodes.FORBIDDEN));
    }

    const user = await userService.getUserById(id);
    if (!user) {
      return next(new AppError('User not found', StatusCodes.NOT_FOUND));
    }
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles updating an existing user.
 * Accessible by ADMIN, or a user updating their own profile.
 */
export const updateUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // A user can update their own profile, otherwise ADMIN access is required.
    // Important: Prevent non-admins from changing their own role.
    if (req.user?.id !== id && req.user?.role !== 'ADMIN') {
      return next(new AppError('You do not have permission to update this user profile.', StatusCodes.FORBIDDEN));
    }
    // If not an admin, ensure they are not trying to change their role
    if (req.user?.role !== 'ADMIN' && updateData.role) {
      return next(new AppError('You are not authorized to change user roles.', StatusCodes.FORBIDDEN));
    }

    const updatedUser = await userService.updateUser(id, updateData);
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: { user: updatedUser },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles deleting a user.
 * Accessible by ADMIN.
 */
export const deleteUserHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    // Prevent an admin from deleting themselves if this is a critical system
    if (req.user?.id === id && req.user?.role === 'ADMIN') {
        return next(new AppError('Admin cannot delete their own account.', StatusCodes.FORBIDDEN));
    }

    await userService.deleteUser(id);
    res.status(StatusCodes.NO_CONTENT).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
```