import { AppDataSource } from '../db/data-source';
import { User, UserRole } from '../db/entities/User';
import { CustomError } from '../middleware/errorHandler';
import bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';

class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async getAllUsers(currentUserRole: UserRole) {
    if (currentUserRole !== UserRole.ADMIN) {
      throw new CustomError('Forbidden: Only administrators can view all users', 403);
    }
    return this.userRepository.find({ select: ['id', 'username', 'email', 'role', 'createdAt'] });
  }

  async getUserById(id: string, requesterId: string, requesterRole: UserRole) {
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.id !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new CustomError('Forbidden: You can only view your own profile unless you are an admin', 403);
    }

    return user;
  }

  async updateUser(id: string, requesterId: string, requesterRole: UserRole, updateData: Partial<User>) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.id !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new CustomError('Forbidden: You can only update your own profile unless you are an admin', 403);
    }

    // Prevent changing ID or sensitive fields unintentionally
    if (updateData.id) delete updateData.id;
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }
    // Only admin can change role
    if (updateData.role && requesterRole !== UserRole.ADMIN) {
      delete updateData.role;
      logger.warn(`Non-admin user ${requesterId} attempted to change role for user ${id}`);
    }

    Object.assign(user, updateData);
    await this.userRepository.save(user);
    logger.info(`User ${id} updated by ${requesterId}`);
    return user;
  }

  async deleteUser(id: string, requesterId: string, requesterRole: UserRole) {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    if (user.id !== requesterId && requesterRole !== UserRole.ADMIN) {
      throw new CustomError('Forbidden: You can only delete your own profile unless you are an admin', 403);
    }
    
    if (user.role === UserRole.ADMIN && requesterRole !== UserRole.ADMIN) {
        throw new CustomError('Forbidden: Only an admin can delete another admin', 403);
    }

    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new CustomError('Failed to delete user', 500);
    }
    logger.info(`User ${id} deleted by ${requesterId}`);
    return { message: 'User deleted successfully' };
  }
}

export const userService = new UserService();