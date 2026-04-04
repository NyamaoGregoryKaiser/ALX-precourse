```javascript
const userService = require('../../services/userService');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const logger = require('../../config/logger');

/**
 * Get the profile of the currently authenticated user.
 */
exports.getMe = catchAsync(async (req, res, next) => {
  // req.user is populated by the protect middleware
  const user = await userService.getUserById(req.user.id);

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

/**
 * Update the profile of the currently authenticated user.
 */
exports.updateMe = catchAsync(async (req, res, next) => {
  // Filter out fields that should not be updated by a regular user (e.g., role, password)
  const filteredBody = {};
  if (req.body.username) filteredBody.username = req.body.username;
  if (req.body.email) filteredBody.email = req.body.email;

  if (Object.keys(filteredBody).length === 0) {
    return next(new AppError('No valid fields provided for update.', 400));
  }

  const updatedUser = await userService.updateProfile(req.user.id, filteredBody);
  logger.info(`User ${req.user.id} updated their profile.`);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * Update the password of the currently authenticated user.
 */
exports.updatePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return next(new AppError('Please provide current and new password.', 400));
  }

  const updatedUser = await userService.updatePassword(req.user.id, currentPassword, newPassword);
  logger.info(`User ${req.user.id} updated their password.`);

  // Note: For security, a token should ideally be reissued or forced re-login after password change.
  // For simplicity here, we just return the updated user.
  res.status(200).json({
    status: 'success',
    message: 'Password updated successfully.',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * Deactivate the account of the currently authenticated user.
 */
exports.deactivateMe = catchAsync(async (req, res, next) => {
  await userService.deactivateAccount(req.user.id);
  logger.info(`User ${req.user.id} deactivated their account.`);

  // In a real app, you might also want to log the user out here (clear cookie/token)
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
  });

  res.status(204).json({
    status: 'success',
    data: null,
  });
});

// Admin-only functionalities

/**
 * Get all users (Admin only).
 */
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const { users, total, results } = await userService.getAllUsers(req.query);
  logger.debug(`Admin fetched ${results} of ${total} users.`);

  res.status(200).json({
    status: 'success',
    results,
    total,
    data: {
      users,
    },
  });
});

/**
 * Get a user by ID (Admin only).
 */
exports.getUserById = catchAsync(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);
  logger.debug(`Admin fetched user: ${user.id}`);

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

/**
 * Update a user's role (Admin only).
 */
exports.updateUserRole = catchAsync(async (req, res, next) => {
  const { role } = req.body;

  if (!role) {
    return next(new AppError('Please provide a role to update.', 400));
  }

  const updatedUser = await userService.updateUserRole(req.params.id, role);
  logger.info(`Admin updated user ${req.params.id} role to ${role}.`);

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser,
    },
  });
});

/**
 * Delete a user (Admin only).
 */
exports.deleteUser = catchAsync(async (req, res, next) => {
  await userService.deleteUser(req.params.id);
  logger.info(`Admin deleted user: ${req.params.id}`);

  res.status(204).json({
    status: 'success',
    data: null,
  });
});
```