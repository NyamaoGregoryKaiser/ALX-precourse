```typescript
import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../entities/User';
import { CustomError } from '../../utils/error';
import logger from '../../services/logger.service';
import _ from 'lodash';

/**
 * Retrieves all users from the database.
 * @returns {Promise<User[]>} An array of user objects.
 */
export const getUsers = async (): Promise<User[]> => {
  const userRepository = AppDataSource.getRepository(User);
  return userRepository.find();
};

/**
 * Retrieves a single user by their ID.
 * @param id The ID of the user.
 * @returns {Promise<User | null>} The user object or null if not found.
 */
export const getUserById = async (id: string): Promise<User | null> => {
  const userRepository = AppDataSource.getRepository(User);
  return userRepository.findOneBy({ id });
};

/**
 * Updates an existing user's information.
 * @param id The ID of the user to update.
 * @param updateData An object containing the fields to update (e.g., email, role).
 * @returns {Promise<User>} The updated user object.
 * @throws {CustomError} If the user is not found or update fails.
 */
export const updateUser = async (id: string, updateData: { email?: string; role?: UserRole }): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);
  let user = await userRepository.findOneBy({ id });

  if (!user) {
    logger.warn(`Attempted to update non-existent user with ID: ${id}`);
    throw new CustomError('User not found.', 404);
  }

  // Prevent direct password updates here, use a dedicated endpoint if needed
  if (updateData.email) {
    user.email = updateData.email;
  }
  if (updateData.role) {
    user.role = updateData.role;
  }

  const updatedUser = await userRepository.save(user);
  logger.info(`User updated: ID ${id}, Email: ${updatedUser.email}`);
  return updatedUser;
};

/**
 * Deletes a user from the database.
 * @param id The ID of the user to delete.
 * @throws {CustomError} If the user is not found.
 */
export const deleteUser = async (id: string): Promise<void> => {
  const userRepository = AppDataSource.getRepository(User);
  const result = await userRepository.delete(id);

  if (result.affected === 0) {
    logger.warn(`Attempted to delete non-existent user with ID: ${id}`);
    throw new CustomError('User not found.', 404);
  }
  logger.info(`User deleted: ID ${id}`);
};
```

#### `backend/src/modules/databases/database.controller.ts`