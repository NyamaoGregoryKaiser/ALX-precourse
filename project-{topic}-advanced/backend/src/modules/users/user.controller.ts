```typescript
import { Request, Response, NextFunction } from 'express';
import * as userService from './user.service';
import { CustomError } from '../../utils/error';
import { UserRole } from '../../entities/User';

/**
 * Get all users (Admin only).
 * @route GET /api/v1/users
 */
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await userService.getUsers();
    res.status(200).json({ success: true, data: users.map(user => ({ id: user.id, email: user.email, role: user.role, createdAt: user.createdAt })) });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a single user by ID (Admin only).
 * @route GET /api/v1/users/:id
 */
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    if (!user) {
      throw new CustomError('User not found.', 404);
    }
    res.status(200).json({ success: true, data: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt } });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a user (Admin only, or user updating their own profile).
 * For simplicity, admin can update any user's role/email.
 * @route PUT /api/v1/users/:id
 */
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    // A user can only update their own profile unless they are an admin
    if (req.user?.id !== id && req.user?.role !== UserRole.ADMIN) {
        throw new CustomError('Unauthorized to update this user.', 403);
    }

    const updatedUser = await userService.updateUser(id, { email, role });
    res.status(200).json({ success: true, message: 'User updated successfully.', data: { id: updatedUser.id, email: updatedUser.email, role: updatedUser.role } });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a user (Admin only).
 * @route DELETE /api/v1/users/:id
 */
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    // Prevent admin from deleting themselves
    if (req.user?.id === id) {
        throw new CustomError('Cannot delete your own account.', 400);
    }
    await userService.deleteUser(id);
    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};
```

#### `backend/src/modules/users/user.service.ts`