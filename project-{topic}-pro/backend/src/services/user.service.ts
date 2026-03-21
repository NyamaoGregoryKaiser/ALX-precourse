```typescript
import { getRepository } from 'typeorm';
import { User, UserRole } from '@models/User';
import AppError, { ErrorType } from '@utils/AppError';
import logger from '@config/logger';

class UserService {
  private userRepository = getRepository(User);

  async getAllUsers(): Promise<User[]> {
    logger.debug('Fetching all users...');
    return this.userRepository.find({
      select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'] // Exclude password
    });
  }

  async getUserById(id: string): Promise<User> {
    logger.debug(`Fetching user by ID: ${id}`);
    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt']
    });
    if (!user) {
      logger.warn(`User with ID ${id} not found.`);
      throw new AppError('User not found.', ErrorType.NOT_FOUND);
    }
    return user;
  }

  async updateUserRole(userId: string, newRole: UserRole): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      logger.warn(`Cannot update role: User with ID ${userId} not found.`);
      throw new AppError('User not found.', ErrorType.NOT_FOUND);
    }

    user.role = newRole;
    await this.userRepository.save(user);
    logger.info(`User ${userId} role updated to ${newRole}`);
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      logger.warn(`Cannot delete: User with ID ${id} not found.`);
      throw new AppError('User not found.', ErrorType.NOT_FOUND);
    }

    await this.userRepository.remove(user);
    logger.info(`User ${id} deleted.`);
  }
}

export default new UserService();
```