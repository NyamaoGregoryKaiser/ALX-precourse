const User = require('../models/User');
const Account = require('../models/Account');
const logger = require('../utils/logger');

class UserService {
  /**
   * Finds a user by ID.
   * @param {string} id - User ID.
   * @returns {Promise<User|null>}
   */
  static async findUserById(id) {
    try {
      return await User.query().findById(id);
    } catch (error) {
      logger.error(`Error finding user by ID ${id}:`, error);
      throw new Error('Failed to retrieve user.');
    }
  }

  /**
   * Finds a user by email.
   * @param {string} email - User email.
   * @returns {Promise<User|null>}
   */
  static async findUserByEmail(email) {
    try {
      return await User.query().findOne({ email });
    } catch (error) {
      logger.error(`Error finding user by email ${email}:`, error);
      throw new Error('Failed to retrieve user.');
    }
  }

  /**
   * Creates a new user and an associated default account.
   * @param {object} userData - User data (email, password, firstName, lastName).
   * @returns {Promise<User>}
   */
  static async createUser(userData) {
    try {
      const existingUser = await User.query().findOne({ email: userData.email });
      if (existingUser) {
        throw new Error('User with this email already exists.');
      }

      // Start a transaction for creating user and account
      const user = await User.transaction(async trx => {
        const newUser = await User.query(trx).insert(userData);

        // Create a default account for the new user
        await Account.query(trx).insert({
          userId: newUser.id,
          accountNumber: `ACC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
          balance: 0,
          currency: 'NGN', // Default currency
        });

        logger.info(`New user created: ${newUser.email} with ID: ${newUser.id}`);
        return newUser;
      });

      return user;
    } catch (error) {
      logger.error('Error creating user:', error);
      throw new Error(error.message || 'Failed to create user.');
    }
  }

  /**
   * Updates user information.
   * @param {string} id - User ID.
   * @param {object} updateData - Data to update.
   * @returns {Promise<User|null>}
   */
  static async updateUser(id, updateData) {
    try {
      const updatedUser = await User.query().patchAndFetchById(id, updateData);
      if (!updatedUser) {
        throw new Error('User not found.');
      }
      logger.info(`User updated: ${id}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Error updating user ${id}:`, error);
      throw new Error('Failed to update user.');
    }
  }

  /**
   * Deletes a user.
   * @param {string} id - User ID.
   * @returns {Promise<number>} - Number of deleted records.
   */
  static async deleteUser(id) {
    try {
      // Consider soft delete in a real production system
      const deletedCount = await User.query().deleteById(id);
      if (deletedCount === 0) {
        throw new Error('User not found.');
      }
      logger.info(`User deleted: ${id}`);
      return deletedCount;
    } catch (error) {
      logger.error(`Error deleting user ${id}:`, error);
      throw new Error('Failed to delete user.');
    }
  }
}

module.exports = UserService;