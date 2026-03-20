const prisma = require('../../prisma/client');
const logger = require('../utils/logger');
const { getCache, setCache, deleteCache } = require('./cache.service');
const { CACHE_KEYS } = require('../config/constants');

/**
 * Get a user by ID
 * @param {string} userId - ID of the user
 * @returns {Promise<object | null>} - User object or null if not found
 */
const getUserById = async (userId) => {
  const cacheKey = CACHE_KEYS.USER_BY_ID(userId);
  const cachedUser = await getCache(cacheKey);
  if (cachedUser) {
    logger.debug(`Cache hit for user ${userId}`);
    return cachedUser;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (user) {
    await setCache(cacheKey, user, 300); // Cache for 5 minutes
    logger.debug(`User ${userId} fetched from DB and cached.`);
  }

  return user;
};

/**
 * Get all users
 * @returns {Promise<Array<object>>} - List of all users
 */
const getAllUsers = async () => {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true
    }
  });
  return users;
};

/**
 * Update a user
 * @param {string} userId - ID of the user to update
 * @param {object} updateData - Data to update
 * @returns {Promise<object>} - Updated user object
 */
const updateUser = async (userId, updateData) => {
  // Ensure sensitive data like password and role are not updated directly here
  if (updateData.password) delete updateData.password;
  // Role update logic could be more restricted based on permissions

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true
    }
  });

  await deleteCache(CACHE_KEYS.USER_BY_ID(userId)); // Invalidate cache
  logger.info(`User ${userId} updated successfully.`);
  return updatedUser;
};

/**
 * Delete a user
 * @param {string} userId - ID of the user to delete
 * @returns {Promise<object>} - Deleted user object
 */
const deleteUser = async (userId) => {
  // Disconnect tasks and projects associated with the user before deleting if necessary,
  // or use Prisma's cascade delete if configured in schema.
  // For this example, we'll assume cascade delete is set up for related entities, or handled.
  const deletedUser = await prisma.user.delete({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true
    }
  });

  await deleteCache(CACHE_KEYS.USER_BY_ID(userId)); // Invalidate cache
  logger.info(`User ${userId} deleted successfully.`);
  return deletedUser;
};

module.exports = {
  getUserById,
  getAllUsers,
  updateUser,
  deleteUser
};