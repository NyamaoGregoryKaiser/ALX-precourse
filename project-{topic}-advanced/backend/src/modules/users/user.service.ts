```typescript
import { AppDataSource } from '../../database/config/data-source';
import { User, UserRole } from '../../database/entities/User';
import { UpdateUserDto } from './user.dtos';
import { CustomError } from '../../shared/errors/CustomError';
import * as bcrypt from 'bcryptjs';
import { logger } from '../../shared/utils/logger';

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  /**
   * Finds all users.
   * Query optimization: In a large application, this would include pagination.
   */
  async findAll(): Promise<User[]> {
    return this.userRepository.find({
      select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'], // Select specific fields
    });
  }

  /**
   * Finds a user by ID.
   */
  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
    });
  }

  /**
   * Updates a user's details.
   */
  async update(id: string, updateData: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new CustomError('User not found', 404);
    }

    // Check for unique constraints if username or email is updated
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.userRepository.findOneBy({ username: updateData.username });
      if (existingUser && existingUser.id !== id) {
        throw new CustomError('Username already taken', 409, { field: 'username' });
      }
    }
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepository.findOneBy({ email: updateData.email });
      if (existingUser && existingUser.id !== id) {
        throw new CustomError('Email already taken', 409, { field: 'email' });
      }
    }

    // Hash new password if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // Ensure role can only be changed by an admin
    if (updateData.role && user.role !== updateData.role) {
      // In a real application, the caller's role would be checked here.
      // For now, we assume the controller handles this authorization.
      user.role = updateData.role;
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  /**
   * Deletes a user.
   */
  async delete(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new CustomError('User not found', 404);
    }
    logger.info(`User ${id} deleted from database.`);
  }

  /**
   * Assigns a role to a user. Only used internally or by admin.
   * @param id User ID
   * @param role New role
   * @returns Updated User object
   */
  async assignRole(id: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new CustomError('User not found', 404);
    }
    user.role = role;
    return this.userRepository.save(user);
  }
}
```