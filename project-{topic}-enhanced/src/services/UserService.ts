```typescript
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import { AppError } from '../utils/AppError';
import * as bcrypt from 'bcryptjs';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';

/**
 * @file User service.
 *
 * Handles business logic for user management, including CRUD operations
 * and interaction with the database repository and cache.
 */

interface UserUpdateData {
  username?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'user';
}

export class UserService {
  private userCacheKey = 'allUsers';

  constructor(
    private userRepository: Repository<User>,
    private cacheService: CacheService
  ) {}

  /**
   * Retrieves all users from the database, leveraging cache.
   * @returns {Promise<User[]>} A list of all users.
   */
  async findAll(): Promise<User[]> {
    const cachedUsers = this.cacheService.get<User[]>(this.userCacheKey);
    if (cachedUsers) {
      logger.debug('Fetching all users from cache.');
      return cachedUsers;
    }

    const users = await this.userRepository.find({
      select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
    });
    this.cacheService.set(this.userCacheKey, users);
    logger.debug('Fetching all users from DB and caching.');
    return users;
  }

  /**
   * Finds a user by their ID, leveraging cache.
   * @param {string} id - The ID of the user.
   * @returns {Promise<User | null>} The user object or null if not found.
   */
  async findById(id: string): Promise<User | null> {
    const cacheKey = `user:${id}`;
    const cachedUser = this.cacheService.get<User>(cacheKey);
    if (cachedUser) {
      logger.debug(`Fetching user ${id} from cache.`);
      return cachedUser;
    }

    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
    });

    if (user) {
      this.cacheService.set(cacheKey, user);
      logger.debug(`Fetching user ${id} from DB and caching.`);
    } else {
      logger.warn(`User with ID ${id} not found.`);
    }
    return user;
  }

  /**
   * Updates an existing user.
   * @param {string} id - The ID of the user to update.
   * @param {UserUpdateData} updateData - Data to update the user with.
   * @returns {Promise<User | null>} The updated user object or null if not found.
   * @throws {AppError} If username or email already exists.
   */
  async update(id: string, updateData: UserUpdateData): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new AppError('User not found', 404);
    }

    // Check for duplicate username/email if they are being updated
    if (updateData.username && updateData.username !== user.username) {
      const existingUser = await this.userRepository.findOneBy({ username: updateData.username });
      if (existingUser && existingUser.id !== id) {
        throw new AppError('Username already taken', 409);
      }
    }
    if (updateData.email && updateData.email !== user.email) {
      const existingUser = await this.userRepository.findOneBy({ email: updateData.email });
      if (existingUser && existingUser.id !== id) {
        throw new AppError('Email already registered', 409);
      }
    }

    // Hash new password if provided
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    Object.assign(user, updateData);
    await this.userRepository.save(user);

    this.cacheService.del(this.userCacheKey); // Invalidate all users cache
    this.cacheService.del(`user:${id}`); // Invalidate specific user cache
    logger.info(`User ${id} updated, caches invalidated.`);

    // Return the user without the password field
    const { password, ...result } = user;
    return result as User;
  }

  /**
   * Deletes a user by their ID.
   * @param {string} id - The ID of the user to delete.
   * @returns {Promise<boolean>} True if user was deleted, false otherwise.
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    if (result.affected && result.affected > 0) {
      this.cacheService.del(this.userCacheKey); // Invalidate all users cache
      this.cacheService.del(`user:${id}`); // Invalidate specific user cache
      logger.info(`User ${id} deleted, caches invalidated.`);
      return true;
    }
    return false;
  }
}
```