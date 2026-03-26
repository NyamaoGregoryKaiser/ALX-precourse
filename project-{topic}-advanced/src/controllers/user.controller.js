```javascript
const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const userService = require('../services/user.service');
const logger = require('../utils/logger');

/**
 * Creates a new user. Only accessible by admins.
 */
const createUser = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  logger.info(`Admin created new user: ${user.email} (ID: ${user.id})`);
  res.status(httpStatus.CREATED).send(user);
});

/**
 * Retrieves multiple users with pagination and filtering. Only accessible by admins.
 */
const getUsers = catchAsync(async (req, res) => {
  const filter = pick(req.query, ['name', 'role']);
  const options = pick(req.query, ['sortBy', 'limit', 'page']);
  const result = await userService.queryUsers(filter, options);
  logger.debug(`Admin fetched users with filter: ${JSON.stringify(filter)}`);
  res.send(result);
});

/**
 * Retrieves a single user by ID. Accessible by admins (any user) and regular users (their own profile).
 */
const getUser = catchAsync(async (req, res) => {
  // Allow user to fetch their own profile or admin to fetch any profile
  if (req.user.role === 'user' && req.user.id !== parseInt(req.params.userId, 10)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only view your own profile');
  }

  const user = await userService.getUserById(req.params.userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  logger.debug(`User (ID: ${req.user.id}, Role: ${req.user.role}) fetched user with ID: ${user.id}`);
  res.send(user);
});

/**
 * Updates a user by ID.
 * Admins can update any user. Users can update their own profile (excluding role).
 */
const updateUser = catchAsync(async (req, res) => {
  // Ensure a user can't update another user's profile unless they are admin
  if (req.user.role === 'user' && req.user.id !== parseInt(req.params.userId, 10)) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: You can only update your own profile');
  }

  // Prevent regular users from updating their role
  if (req.user.role === 'user' && req.body.role) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden: Users cannot update their role');
  }

  const user = await userService.updateUserById(req.params.userId, req.body, req.user.role === 'admin');
  logger.info(`User (ID: ${req.user.id}, Role: ${req.user.role}) updated user with ID: ${user.id}`);
  res.send(user);
});

/**
 * Deletes a user by ID. Only accessible by admins.
 */
const deleteUser = catchAsync(async (req, res) => {
  await userService.deleteUserById(req.params.userId);
  logger.info(`Admin (ID: ${req.user.id}) deleted user with ID: ${req.params.userId}`);
  res.status(httpStatus.NO_CONTENT).send();
});

module.exports = {
  createUser,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};
```