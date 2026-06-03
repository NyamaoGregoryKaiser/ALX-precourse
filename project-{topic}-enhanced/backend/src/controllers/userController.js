```javascript
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const db = require('../config/db');
const { hashPassword } = require('../utils/crypt');
const cacheService = require('../services/cacheService');

// Helper to remove password field from user objects
const filterUserOutput = (user) => {
  const { password, ...filtered } = user;
  return filtered;
};

// @desc    Get current logged in user
// @route   GET /api/v1/users/me
// @access  Private
exports.getMe = catchAsync(async (req, res, next) => {
  const user = await db('users').where({ id: req.user.id }).first();
  if (!user) {
    return next(new AppError('User not found.', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { user: filterUserOutput(user) }
  });
});

// @desc    Update current logged in user
// @route   PATCH /api/v1/users/me
// @access  Private
exports.updateMe = catchAsync(async (req, res, next) => {
  const { name, email, password } = req.body;
  const updateData = { updated_at: new Date() };

  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) updateData.password = await hashPassword(password);

  const [updatedUser] = await db('users')
    .where({ id: req.user.id })
    .update(updateData)
    .returning('*');

  if (!updatedUser) {
    return next(new AppError('User not found for update.', 404));
  }

  // Invalidate user cache
  await cacheService.del(`user:${req.user.id}`);

  res.status(200).json({
    status: 'success',
    data: { user: filterUserOutput(updatedUser) }
  });
});

// @desc    Delete current logged in user (soft delete)
// @route   DELETE /api/v1/users/me
// @access  Private
exports.deleteMe = catchAsync(async (req, res, next) => {
  await db('users')
    .where({ id: req.user.id })
    .update({ status: 'inactive', updated_at: new Date() }); // Soft delete

  // Invalidate user cache
  await cacheService.del(`user:${req.user.id}`);

  res.status(204).json({
    status: 'success',
    data: null
  });
});

// Admin-only functions
// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await db('users').select('*'); // Be careful with * in prod, filter fields
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users: users.map(filterUserOutput) }
  });
});

// @desc    Get user by ID
// @route   GET /api/v1/users/:id
// @access  Private/Admin
exports.getUserById = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await db('users').where({ id }).first();
  if (!user) {
    return next(new AppError('User not found.', 404));
  }
  res.status(200).json({
    status: 'success',
    data: { user: filterUserOutput(user) }
  });
});

// @desc    Update user by ID
// @route   PATCH /api/v1/users/:id
// @access  Private/Admin
exports.updateUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const { name, email, password, type, status } = req.body;
  const updateData = { updated_at: new Date() };

  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (password) updateData.password = await hashPassword(password);
  if (type) updateData.type = type;
  if (status) updateData.status = status;

  const [updatedUser] = await db('users')
    .where({ id })
    .update(updateData)
    .returning('*');

  if (!updatedUser) {
    return next(new AppError('User not found for update.', 404));
  }

  await cacheService.del(`user:${id}`); // Invalidate user cache
  res.status(200).json({
    status: 'success',
    data: { user: filterUserOutput(updatedUser) }
  });
});

// @desc    Delete user by ID (soft delete)
// @route   DELETE /api/v1/users/:id
// @access  Private/Admin
exports.deleteUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const rowsAffected = await db('users')
    .where({ id })
    .update({ status: 'inactive', updated_at: new Date() });

  if (rowsAffected === 0) {
    return next(new AppError('User not found for deletion.', 404));
  }

  await cacheService.del(`user:${id}`); // Invalidate user cache
  res.status(204).json({
    status: 'success',
    data: null
  });
});
```