const sequelize = require('../config/database');
const User = require('../models/User')(sequelize, require('sequelize'));
const { NotFoundError, APIError } = require('../utils/errors');
const logger = require('../config/logger');

exports.getAllUsers = async (page, limit) => {
  try {
    const offset = (page - 1) * limit;
    const { count, rows } = await User.findAndCountAll({
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'], // Exclude password
    });
    return { users: rows, total: count };
  } catch (error) {
    logger.error(`Error getting all users: ${error.message}`, { page, limit, error });
    throw new APIError('Failed to retrieve users', 500);
  }
};

exports.getUserById = async (id) => {
  try {
    const user = await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'], // Exclude password
    });
    return user;
  } catch (error) {
    logger.error(`Error getting user by ID ${id}: ${error.message}`, { error });
    throw new APIError(`Failed to retrieve user with ID ${id}`, 500);
  }
};

exports.updateUser = async (id, updatedUserData) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      throw new NotFoundError(`User with ID ${id} not found`);
    }

    // Only allow specific fields to be updated
    const allowedUpdates = ['username', 'email', 'password', 'role'];
    const filteredUpdates = Object.keys(updatedUserData).reduce((acc, key) => {
      if (allowedUpdates.includes(key)) {
        acc[key] = updatedUserData[key];
      }
      return acc;
    }, {});

    await user.update(filteredUpdates);
    const updatedUser = await User.findByPk(id, {
      attributes: ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt'],
    });
    return updatedUser;
  } catch (error) {
    if (error instanceof NotFoundError) throw error;
    logger.error(`Error updating user ${id}: ${error.message}`, { updatedUserData, error });
    throw new APIError(`Failed to update user with ID ${id}`, 500);
  }
};

exports.deleteUser = async (id) => {
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return false; // Indicate not found
    }
    await user.destroy();
    return true; // Indicate successful deletion
  } catch (error) {
    logger.error(`Error deleting user ${id}: ${error.message}`, { error });
    throw new APIError(`Failed to delete user with ID ${id}`, 500);
  }
};
```