const knex = require('knex');
const knexConfig = require('../db/knexfile');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const { validateSchema } = require('../utils/helpers');
const { updateUserSchema } = require('../models/userSchema');
const logger = require('../utils/logger');
const { deleteCache, setCache, getCache } = require('../utils/cache');
const { USER_ROLES, ERROR_MESSAGES } = require('../utils/constants');

const db = knex(knexConfig[config.env]);
const USER_CACHE_PREFIX = 'user:';

/**
 * Retrieves a user by their ID.
 * @param {string} userId - The ID of the user.
 * @returns {object} - User object.
 * @throws {ApiError} If user not found.
 */
const getUserById = async (userId) => {
  const cacheKey = `${USER_CACHE_PREFIX}${userId}`;
  let user = await getCache(cacheKey);

  if (user) {
    logger.debug(`User ${userId} fetched from cache.`);
    return user;
  }

  user = await db('users')
    .select('id', 'username', 'email', 'role', 'created_at', 'updated_at')
    .where({ id: userId })
    .first();

  if (!user) {
    throw new ApiError(404, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  await setCache(cacheKey, user);
  logger.info(`User ${userId} fetched from DB and cached.`);
  return user;
};

/**
 * Retrieves all users.
 * @returns {Array<object>} - Array of user objects.
 */
const getAllUsers = async () => {
  const users = await db('users')
    .select('id', 'username', 'email', 'role', 'created_at', 'updated_at');
  return users;
};

/**
 * Updates a user's information.
 * @param {string} userId - The ID of the user to update.
 * @param {object} updateData - Data to update (username, email, password, role).
 * @returns {object} - Updated user object.
 * @throws {ApiError} If user not found, or validation fails.
 */
const updateUser = async (userId, updateData) => {
  validateSchema(updateUserSchema, updateData);

  const existingUser = await db('users').where({ id: userId }).first();
  if (!existingUser) {
    throw new ApiError(404, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  // Hash password if it's being updated
  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }

  try {
    const [updatedUser] = await db('users')
      .where({ id: userId })
      .update({ ...updateData, updated_at: db.fn.now() })
      .returning(['id', 'username', 'email', 'role', 'created_at', 'updated_at']);

    await deleteCache(`${USER_CACHE_PREFIX}${userId}`); // Invalidate cache
    logger.info(`User ${userId} updated and cache invalidated.`);
    return updatedUser;
  } catch (error) {
    logger.error(`Error updating user ${userId}:`, error);
    throw new ApiError(500, 'Failed to update user.');
  }
};

/**
 * Deletes a user by their ID.
 * @param {string} userId - The ID of the user to delete.
 * @returns {string} - Success message.
 * @throws {ApiError} If user not found.
 */
const deleteUser = async (userId) => {
  const existingUser = await db('users').where({ id: userId }).first();
  if (!existingUser) {
    throw new ApiError(404, ERROR_MESSAGES.USER_NOT_FOUND);
  }

  try {
    // In a real system, you might soft delete or archive users
    // Also, consider cascading deletes for accounts/transactions or preventing deletion
    await db.transaction(async (trx) => {
      // Delete user's accounts first
      await trx('accounts').where({ user_id: userId }).del();
      // Then delete the user
      await trx('users').where({ id: userId }).del();
    });

    await deleteCache(`${USER_CACHE_PREFIX}${userId}`); // Invalidate cache
    logger.info(`User ${userId} and associated accounts deleted. Cache invalidated.`);
    return 'User deleted successfully.';
  } catch (error) {
    logger.error(`Error deleting user ${userId}:`, error);
    throw new ApiError(500, 'Failed to delete user and associated data.');
  }
};

module.exports = {
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser,
};