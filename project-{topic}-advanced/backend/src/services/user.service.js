const httpStatus = require('http-status');
const { User } = require('../db/models');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger.config');

const createUser = async (userBody) => {
  if (await User.findOne({ where: { email: userBody.email } })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  const user = await User.create(userBody);
  return user;
};

const queryUsers = async (filter, options) => {
  const { sortBy, limit, page } = options;
  const offset = (page - 1) * limit;

  const users = await User.findAndCountAll({
    where: filter,
    order: sortBy ? [sortBy.split(':')] : [['createdAt', 'DESC']],
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
    attributes: { exclude: ['password'] }, // Exclude password from query results
  });

  return {
    results: users.rows,
    totalResults: users.count,
    limit: parseInt(limit, 10) || users.count,
    page: parseInt(page, 10) || 1,
    totalPages: Math.ceil(users.count / (parseInt(limit, 10) || users.count)),
  };
};

const getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] },
  });
  if (!user) {
    logger.warn(`User with ID ${id} not found.`);
  }
  return user;
};

const getUserByEmail = async (email) => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    logger.warn(`User with email ${email} not found.`);
  }
  return user;
};

const updateUserById = async (userId, updateBody) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  if (updateBody.email && (await User.findOne({ where: { email: updateBody.email, id: { [User.sequelize.Op.ne]: userId } } }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  Object.assign(user, updateBody);
  await user.save();
  return user;
};

const deleteUserById = async (userId) => {
  const user = await getUserById(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await user.destroy();
};

module.exports = {
  createUser,
  queryUsers,
  getUserById,
  getUserByEmail,
  updateUserById,
  deleteUserById,
};