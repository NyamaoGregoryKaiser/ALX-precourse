```javascript
const { User } = require('../db/models');
const { AppError } = require('../utils/errorHandler');
const logger = require('../utils/logger');
const cache = require('../utils/cache'); // Assuming user list might be cached

// Cache key for all users
const ALL_USERS_CACHE_KEY = 'all_users';

exports.findAllUsers = async () => {
  try {
    const cachedUsers = await cache.get(ALL_USERS_CACHE_KEY);
    if (cachedUsers) {
      logger.debug('Fetching all users from cache.');
      return JSON.parse(cachedUsers);
    }

    const users = await User.findAll(); // Default scope excludes password
    await cache.set(ALL_USERS_CACHE_KEY, JSON.stringify(users), 300); // Cache for 5 minutes
    logger.debug('Fetched all users from DB and cached.');
    return users;
  } catch (error) {
    logger.error(`Error finding all users: ${error.message}`, error);
    throw new AppError('Could not retrieve users.', 500);
  }
};

exports.findUserById = async (id) => {
  try {
    const user = await User.findByPk(id); // Default scope excludes password
    return user;
  } catch (error) {
    logger.error(`Error finding user by ID ${id}: ${error.message}`, error);
    throw new AppError('Could not retrieve user.', 500);
  }
};

exports.createUser = async (userData) => {
  try {
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new AppError('User with that email already exists.', 409);
    }
    const user = await User.create(userData); // Password hashing handled by model hook
    await cache.del(ALL_USERS_CACHE_KEY); // Invalidate cache for all users
    return user;
  } catch (error) {
    logger.error(`Error creating user: ${error.message}`, error);
    throw error; // Re-throw to be caught by controller/errorHandler
  }
};

exports.updateUser = async (id, updateData) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return null;
    }

    // If password is in updateData, it will be hashed by the model's beforeUpdate hook
    const updatedUser = await user.update(updateData);
    await cache.del(ALL_USERS_CACHE_KEY); // Invalidate cache for all users
    return updatedUser;
  } catch (error) {
    logger.error(`Error updating user ID ${id}: ${error.message}`, error);
    throw error;
  }
};

exports.deleteUser = async (id) => {
  try {
    const deletedCount = await User.destroy({ where: { id } });
    if (deletedCount === 0) {
      return false; // User not found
    }
    await cache.del(ALL_USERS_CACHE_KEY); // Invalidate cache for all users
    return true;
  } catch (error) {
    logger.error(`Error deleting user ID ${id}: ${error.message}`, error);
    throw new AppError('Could not delete user.', 500);
  }
};
```