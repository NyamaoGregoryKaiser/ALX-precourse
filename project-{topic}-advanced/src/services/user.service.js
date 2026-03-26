```javascript
const httpStatus = require('http-status');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');
const { Op } = require('sequelize'); // Import Op for LIKE operator

/**
 * Create a user
 * @param {object} userBody
 * @returns {Promise<User>}
 */
const createUser = async (userBody) => {
  if (await User.isEmailTaken(userBody.email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  return User.create(userBody);
};

/**
 * Query for users with pagination, sorting, and filtering.
 * @param {object} filter - Filter options (e.g., { name: 'John', role: 'user' })
 * @param {object} options - Pagination and sorting options (e.g., { sortBy: 'name:asc', limit: 10, page: 1 })
 * @returns {Promise<QueryResult>}
 */
const queryUsers = async (filter, options) => {
  const { sortBy, limit = 10, page = 1 } = options;
  const offset = (page - 1) * limit;

  const where = {};
  if (filter.name) {
    where.name = { [Op.iLike]: `%${filter.name}%` }; // Case-insensitive search
  }
  if (filter.role) {
    where.role = filter.role;
  }

  const order = [];
  if (sortBy) {
    const parts = sortBy.split(',');
    parts.forEach((part) => {
      const [key, direction] = part.split(':');
      if (key && direction) {
        order.push([key, direction.toUpperCase()]);
      }
    });
  } else {
    order.push(['createdAt', 'DESC']); // Default sort
  }

  const { count, rows } = await User.findAndCountAll({
    where,
    order,
    limit,
    offset,
  });

  return {
    results: rows,
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
    totalPages: Math.ceil(count / limit),
    totalResults: count,
  };
};

/**
 * Get user by ID
 * @param {number} id
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
 * @param {number} userId
 * @param {object} updateBody
 * @param {boolean} isAdmin - Flag to determine if the update is by an admin
 * @returns {Promise<User>}
 */
const updateUserById = async (userId, updateBody, isAdmin = false) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.isEmailTaken(updateBody.email, userId))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }

  // Only admin can update the role
  if (!isAdmin && updateBody.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Users cannot update their role');
  }

  Object.assign(user, updateBody);
  await user.save();
  return user;
};

/**
 * Delete user by ID
 * @param {number} userId
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

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};
```