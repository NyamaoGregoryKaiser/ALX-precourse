```javascript
import { PrismaClient } from '@prisma/client';
import logger from '../config/logger.js';

const prisma = new PrismaClient();

/**
 * User repository layer for interacting with the database.
 * Abstracts Prisma client operations.
 */
class UserRepository {
  /**
   * Creates a new user in the database.
   * @param {object} userData - Data for the new user (username, email, passwordHash).
   * @returns {Promise<object>} The created user object (excluding passwordHash).
   */
  async createUser(userData) {
    logger.debug(`Creating user with email: ${userData.email}`);
    try {
      const user = await prisma.user.create({
        data: userData,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      logger.info(`User created successfully: ${user.email}`);
      return user;
    } catch (error) {
      logger.error(`Error creating user ${userData.email}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds a user by their ID.
   * @param {string} userId - The ID of the user.
   * @returns {Promise<object|null>} The user object or null if not found.
   */
  async findUserById(userId) {
    logger.debug(`Finding user by ID: ${userId}`);
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return user;
    } catch (error) {
      logger.error(`Error finding user by ID ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds a user by their email.
   * @param {string} email - The email of the user.
   * @returns {Promise<object|null>} The user object (including passwordHash) or null if not found.
   */
  async findUserByEmail(email) {
    logger.debug(`Finding user by email: ${email}`);
    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });
      return user;
    } catch (error) {
      logger.error(`Error finding user by email ${email}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds a user by their username.
   * @param {string} username - The username of the user.
   * @returns {Promise<object|null>} The user object (including passwordHash) or null if not found.
   */
  async findUserByUsername(username) {
    logger.debug(`Finding user by username: ${username}`);
    try {
      const user = await prisma.user.findUnique({
        where: { username },
      });
      return user;
    } catch (error) {
      logger.error(`Error finding user by username ${username}:`, error.message);
      throw error;
    }
  }

  /**
   * Updates a user's information.
   * @param {string} userId - The ID of the user to update.
   * @param {object} updateData - Data to update (e.g., username, email, passwordHash).
   * @returns {Promise<object>} The updated user object (excluding passwordHash).
   */
  async updateUser(userId, updateData) {
    logger.debug(`Updating user ID: ${userId}`);
    try {
      const user = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      logger.info(`User ID ${userId} updated successfully.`);
      return user;
    } catch (error) {
      logger.error(`Error updating user ID ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Deletes a user by their ID.
   * @param {string} userId - The ID of the user to delete.
   * @returns {Promise<object>} The deleted user object (excluding passwordHash).
   */
  async deleteUser(userId) {
    logger.debug(`Deleting user ID: ${userId}`);
    try {
      const user = await prisma.user.delete({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
        },
      });
      logger.info(`User ID ${userId} deleted successfully.`);
      return user;
    } catch (error) {
      logger.error(`Error deleting user ID ${userId}:`, error.message);
      throw error;
    }
  }

  /**
   * Finds all users.
   * @returns {Promise<object[]>} An array of all user objects (excluding passwordHash).
   */
  async findAllUsers() {
    logger.debug('Finding all users');
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          username: true,
          email: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return users;
    } catch (error) {
      logger.error('Error finding all users:', error.message);
      throw error;
    }
  }
}

export default new UserRepository();
```