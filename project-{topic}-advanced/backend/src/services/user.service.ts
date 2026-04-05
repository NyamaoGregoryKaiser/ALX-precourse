```typescript
import { StatusCodes } from 'http-status-codes';
import { AuthRequest } from '../middleware/auth.middleware';
import { NextFunction, Response } from 'express';
import { UserRepository } from '../repositories/User.repository';
import { ApiError } from '../utils/api-error';
import { hashPassword } from '../utils/password.utils';
import { UserRole } from '../entities/User.entity';

interface UserData {
  username?: string;
  email?: string;
  password?: string;
  role?: UserRole;
}

export class UserController {
  private userRepository: UserRepository;

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository;
  }

  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Find users without selecting password
      const users = await this.userRepository.find({ select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'] });
      res.status(StatusCodes.OK).json(users);
    } catch (error) {
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve users.'));
    }
  }

  async getUserById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user!; // Authenticated user

      // Admin can view any user, regular user can only view their own profile
      if (user.role !== UserRole.ADMIN && user.id !== id) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this user profile.'));
      }

      const foundUser = await this.userRepository.findOne({
        where: { id },
        select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
      });

      if (!foundUser) {
        return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found.'));
      }

      res.status(StatusCodes.OK).json(foundUser);
    } catch (error) {
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to retrieve user.'));
    }
  }

  async updateUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;
      const data: UserData = req.body;

      const userToUpdate = await this.userRepository.findById(id);

      if (!userToUpdate) {
        return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found.'));
      }

      // Authorization check
      if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to update this user.'));
      }

      // Regular users cannot change their role
      if (currentUser.role !== UserRole.ADMIN && data.role && data.role !== userToUpdate.role) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to change user roles.'));
      }

      // Admins cannot change their own role to something other than admin if they are the only admin
      // (This is a complex edge case for a full project, simplified for this example)
      if (data.role && currentUser.role === UserRole.ADMIN && userToUpdate.id === currentUser.id && data.role !== UserRole.ADMIN) {
        const adminCount = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
        if (adminCount <= 1) { // If this is the last admin
          return next(new ApiError(StatusCodes.FORBIDDEN, 'Cannot demote the last admin user.'));
        }
      }

      if (data.password) {
        data.password = await hashPassword(data.password);
      }

      Object.assign(userToUpdate, data);
      await this.userRepository.save(userToUpdate);

      // Remove password before sending response
      delete userToUpdate.password;

      res.status(StatusCodes.OK).json(userToUpdate);
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error);
      }
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to update user.'));
    }
  }

  async deleteUser(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const currentUser = req.user!;

      const userToDelete = await this.userRepository.findById(id);

      if (!userToDelete) {
        return next(new ApiError(StatusCodes.NOT_FOUND, 'User not found.'));
      }

      // Authorization check
      if (currentUser.role !== UserRole.ADMIN && currentUser.id !== id) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to delete this user.'));
      }

      // Prevent admin from deleting themselves if they are the last admin
      if (currentUser.role === UserRole.ADMIN && userToDelete.id === currentUser.id) {
        const adminCount = await this.userRepository.count({ where: { role: UserRole.ADMIN } });
        if (adminCount <= 1) {
          return next(new ApiError(StatusCodes.FORBIDDEN, 'Cannot delete the last admin user.'));
        }
      }

      await this.userRepository.remove(userToDelete);
      res.status(StatusCodes.NO_CONTENT).send();
    } catch (error) {
      if (error instanceof ApiError) {
        return next(error);
      }
      next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to delete user.'));
    }
  }
}
```