```typescript
import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/userService';
import { AppError } from '../utils/errorHandler';
import Joi from 'joi';

// Schema for updating user data (excluding password and role for general user updates)
const updateUserSchema = Joi.object({
  name: Joi.string().min(3).max(50).optional(),
  email: Joi.string().email().optional(),
  address: Joi.string().allow('').optional(),
  phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).allow('').optional(),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update.'
});

// Schema for admin updating user data (including role)
const adminUpdateUserSchema = updateUserSchema.keys({
  role: Joi.string().valid('USER', 'ADMIN').optional(),
});


export const getUserProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }
    const user = await userService.getUserById(req.user.id);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err: any) {
    next(err);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('User not authenticated.', 401));
    }
    const { error, value } = updateUserSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    // Prevent users from changing their own role
    if (value.role) {
      return next(new AppError('You are not allowed to change your role.', 403));
    }

    const updatedUser = await userService.updateUser(req.user.id, value);
    res.status(200).json({
      status: 'success',
      data: { user: updatedUser },
    });
  } catch (err: any) {
    next(err);
  }
};

// --- Admin-specific user management ---
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const search = req.query.search as string | undefined;
    const role = req.query.role as 'USER' | 'ADMIN' | undefined;

    const { users, total, page: currentPage, limit: currentLimit } = await userService.getAllUsers(page, limit, search, role);

    res.status(200).json({
      status: 'success',
      results: users.length,
      pagination: {
        total,
        page: currentPage,
        limit: currentLimit,
        totalPages: Math.ceil(total / currentLimit),
      },
      data: { users },
    });
  } catch (err: any) {
    next(err);
  }
};

export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({
      status: 'success',
      data: { user },
    });
  } catch (err: any) {
    next(err);
  }
};

export const updateUserByAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = adminUpdateUserSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    const updatedUser = await userService.updateUser(req.params.id, value);
    res.status(200).json({
      status: 'success',
      data: { user: updatedUser },
    });
  } catch (err: any) {
    next(err);
  }
};

export const deleteUserByAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Prevent admin from deleting themselves
    if (req.user && req.user.id === req.params.id) {
      return next(new AppError('Admins cannot delete their own account via this endpoint.', 403));
    }
    await userService.deleteUser(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err: any) {
    next(err);
  }
};
```