```javascript
const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Create a user
 * @param {Object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await User.isUsernameTaken(userBody.username)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }
  return User.create(userBody);
};

/**
 * Query for users
 * @param {Object} filter - Sequelize filter
 * @param {Object} options - Query options like sortBy, limit, page
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const { sortBy, limit, page } = options;
  const offset = (page - 1) * limit;

  let order = [];
  if (sortBy) {
    const [field, sortOrder] = sortBy.split(':');
    order.push([field, sortOrder.toUpperCase()]);
  }

  const where = {};
  if (filter.username) {
    where.username = { [Op.iLike]: `%${filter.username}%` };
  }
  if (filter.email) {
    where.email = { [Op.iLike]: `%${filter.email}%` };
  }
  if (filter.role) {
    where.role = filter.role;
  }

  const { count, rows: users } = await User.findAndCountAll({
    where,
    order,
    limit,
    offset,
  });

  return {
    users,
    totalResults: count,
    limit,
    page,
    totalPages: Math.ceil(count / limit),
  };
};


/**
 * Get user by ID
 * @param {string} id
 * @returns {Promise<User>}
 */
const getUserById = async (id) => {
  return User.findByPk(id);
};

/**
 * Get user by email
 * @param {string} email
 * @returns {Promise<User>}
 */
const getUserByEmail = async (email) => {
  return User.findOne({ where: { email } });
};

/**
 * Update user by ID
 * @param {string} userId
 * @param {Object} updateBody
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && updateBody.email !== user.email && (await User.isEmailTaken(updateBody.email))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.username && updateBody.username !== user.username && (await User.isUsernameTaken(updateBody.username))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by ID
 * @param {string} userId
 * @returns {Promise<User>}
 */
const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.destroy();
  return user;
};

// Add static methods to User model for checking existence
User.isEmailTaken = async function (email, excludeUserId) {
  const user = await this.findOne({ where: { email } });
  return !!user && (excludeUserId ? user.id !== excludeUserId : true);
};

User.isUsernameTaken = async function (username, excludeUserId) {
  const user = await this.findOne({ where: { username } });
  return !!user && (excludeUserId ? user.id !== excludeUserId : true);
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
```