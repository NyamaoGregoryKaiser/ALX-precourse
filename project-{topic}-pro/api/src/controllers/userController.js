```javascript
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const ApiError = require('../utils/ApiError');
const pick = require('../utils/pick');
const logger = require('../config/logger');

/**
 * Get all users
 */
const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['firstName', 'lastName', 'email', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  res.send(result);
});

/**
 * Get user by ID
 */
const getUser = catchAsync(async (req, res) => {
  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  res.send(user.toJSON());
});

/**
 * Update user by ID
 */
const updateUser = catchAsync(async (req, res) => {
  // Disallow role changes via this general update endpoint, or restrict to admin
  if (req.body.role && req.user.role !== 'admin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Users are not allowed to change their own role.');
  }

  // Filter out sensitive fields or fields not meant for direct update
  const updateBody = pick(req.body, ['firstName', 'lastName', 'email', 'password', 'profilePicture', 'role']);
  const user = await userService.updateUserById(req.params.userId, updateBody);
  res.send(user.toJSON());
});

/**
 * Delete user by ID
 */
const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
```