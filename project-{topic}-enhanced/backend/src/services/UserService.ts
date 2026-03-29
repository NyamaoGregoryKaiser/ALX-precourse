```typescript
import { User } from '../entities/User';
import { UserRepository } from '../repositories/UserRepository';
import bcrypt from 'bcryptjs';
import logger from '../utils/logger';

/**
 * Service layer for User-related business logic (CRUD operations beyond auth).
 * Encapsulates database interactions and business rules for User entities.
 */
export class UserService {
  /**
   * Fetches all users from the database.
   * @returns A promise that resolves to an array of User entities.
   */
  async getAllUsers(): Promise<User[]> {
    logger.debug('Fetching all users...');
    return UserRepository.find();
  }

  /**
   * Fetches a single user by their ID.
   * @param id The UUID of the user.
   * @returns A promise that resolves to the User entity or null if not found.
   */
  async getUserById(id: string): Promise<User | null> {
    logger.debug(`Fetching user by ID: ${id}`);
    return UserRepository.findOneBy({ id });
  }

  /**
   * Updates an existing user's information.
   * @param id The UUID of the user to update.
   * @param userData Partial user data to update.
   * @returns A promise that resolves to the updated User entity or null if not found.
   */
  async updateUser(id: string, userData: Partial<User>): Promise<User | null> {
    const user = await UserRepository.findOneBy({ id });
    if (!user) {
      logger.warn(`Update failed: User with ID ${id} not found.`);
      return null;
    }

    // Hash new password if provided
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    // Update user properties, excluding id and createdAt from direct assignment for safety
    Object.assign(user, userData);
    await UserRepository.save(user);
    logger.info(`User updated successfully: ${user.email}`);
    return user;
  }

  /**
   * Deletes a user by their ID.
   * @param id The UUID of the user to delete.
   * @returns A boolean indicating whether the deletion was successful.
   */
  async deleteUser(id: string): Promise<boolean> {
    const deleteResult = await UserRepository.delete(id);
    if (deleteResult.affected && deleteResult.affected > 0) {
      logger.info(`User deleted successfully: ID ${id}`);
      return true;
    }
    logger.warn(`Deletion failed: User with ID ${id} not found.`);
    return false;
  }
}
```