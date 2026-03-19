```typescript
import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service';
import { UserRepository } from './user.repository';
import { createUserSchema, updateUserSchema, changePasswordSchema } from './user.dto';
import { catchAsync } from '../../utils/catchAsync';
import { AppError } from '../../utils/appErrors';
import { UserRole } from './user.entity';

const userRepository = new UserRepository();
const userService = new UserService(userRepository);

/**
 * Validates request body against a Zod schema.
 */
const validate = (schema: any) => (req: Request, res: Response, next: NextFunction) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error: any) {
    next(new AppError(error.errors[0].message, 400));
  }
};

/**
 * @route GET /api/v1/users
 * @desc Get all users
 * @access Private (Admin only)
 */
export const getAllUsers = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

/**
 * @route GET /api/v1/users/:id
 * @desc Get user by ID
 * @access Private (Admin, or owner of profile)
 */
export const getUserById = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  const currentUser = req.user;

  // Allow users to get their own profile, or admin to get any profile
  if (currentUser?.id !== userId && currentUser?.role !== UserRole.ADMIN) {
    return next(new AppError('You do not have permission to access this user profile.', 403));
  }

  const user = await userService.getUserById(userId);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

/**
 * @route POST /api/v1/users (Admin only, or public registration if separate route)
 * @desc Create a new user
 * @access Private (Admin only for this route, public for /auth/register)
 */
export const createUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const newUser = await userService.createUser(req.body);
  res.status(201).json({
    status: 'success',
    data: { user: newUser },
  });
});

/**
 * @route PUT /api/v1/users/:id
 * @desc Update user by ID
 * @access Private (Admin, or owner of profile)
 */
export const updateUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  const currentUser = req.user;

  // Allow users to update their own profile, or admin to update any profile
  if (currentUser?.id !== userId && currentUser?.role !== UserRole.ADMIN) {
    return next(new AppError('You do not have permission to update this user profile.', 403));
  }

  // Prevent users from changing their own role or other sensitive fields unless admin
  if (req.body.role && currentUser?.role !== UserRole.ADMIN) {
    return next(new AppError('You are not authorized to change user roles.', 403));
  }
  // Remove password from body if it's there, as password updates should go through changePassword route
  delete req.body.password;

  const updatedUser = await userService.updateUser(userId, req.body);
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

/**
 * @route DELETE /api/v1/users/:id
 * @desc Delete user by ID
 * @access Private (Admin only)
 */
export const deleteUser = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  await userService.deleteUser(userId);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

/**
 * @route PATCH /api/v1/users/change-password/:id
 * @desc Change user's password
 * @access Private (Owner of profile)
 */
export const changePassword = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  if (req.user?.id !== userId) {
    return next(new AppError('You can only change your own password.', 403));
  }

  await userService.changePassword(userId, req.body);
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully.',
  });
});

/**
 * @route PATCH /api/v1/users/update-role/:id
 * @desc Update user's role (Admin only)
 * @access Private (Admin only)
 */
export const updateUserRole = catchAsync(async (req: Request, res: Response, next: NextFunction) => {
  const userId = req.params.id;
  const { role } = req.body;

  if (!role) {
    return next(new AppError('Role is required.', 400));
  }

  const updatedUser = await userService.updateUserRole(userId, role, req.user!);
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

// Export validation middleware for routes
export { validate, createUserSchema, updateUserSchema, changePasswordSchema };
```