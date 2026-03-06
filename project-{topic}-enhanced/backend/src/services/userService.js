```javascript
import httpStatus from 'http-status';
import userRepository from '../repositories/userRepository.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs if not handled by DB

/**
 * Service for managing user-related business logic.
 */
class UserService {
  /**
   * Get user by ID.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object|null>} The user object or null if not found.
   */
  async getUserById(userId) {
    logger.debug(`Fetching user with ID: ${userId}`);
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    return user;
  }

  /**
   * Get user by email.
   * @param {string} email - The email of the user.
   * @returns {Promise<object|null>} The user object or null if not found.
   */
  async getUserByEmail(email) {
    logger.debug(`Fetching user with email: ${email}`);
    const user = await userRepository.findUserByEmail(email);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }
    return user;
  }

  /**
   * Update user details.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateBody - The data to update.
   * @returns {Promise<object>} The updated user object.
   * @throws {ApiError} If user not found or email already taken.
   */
  async updateUserById(userId, updateBody) {
    logger.info(`Updating user ID: ${userId}`);
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    if (updateBody.email && updateBody.email !== user.email) {
      const emailTaken = await userRepository.findUserByEmail(updateBody.email);
      if (emailTaken && emailTaken.id !== userId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
      }
    }

    if (updateBody.username && updateBody.username !== user.username) {
      const usernameTaken = await userRepository.findUserByUsername(updateBody.username);
      if (usernameTaken && usernameTaken.id !== userId) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
      }
    }

    const updatedUser = await userRepository.updateUser(userId, updateBody);
    logger.info(`User ID ${userId} updated successfully.`);
    return updatedUser;
  }

  /**
   * Delete user by ID.
   * @param {string} userId - The ID of the user to delete.
   * @returns {Promise<object>} The deleted user object.
   * @throws {ApiError} If user not found.
   */
  async deleteUserById(userId) {
    logger.info(`Deleting user ID: ${userId}`);
    const user = await userRepository.findUserById(userId);
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
    }

    const deletedUser = await userRepository.deleteUser(userId);
    logger.info(`User ID ${userId} deleted successfully.`);
    return deletedUser;
  }

  /**
   * Get all users.
   * @returns {Promise<object[]>} An array of all user objects.
   */
  async getAllUsers() {
    logger.debug('Fetching all users');
    return userRepository.findAllUsers();
  }
}

export default new UserService();
```