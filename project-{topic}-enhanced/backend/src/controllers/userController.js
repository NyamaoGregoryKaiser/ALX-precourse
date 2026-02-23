```javascript
const userService = require('../services/userService');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const getAllUsers = catchAsync(async (req, res) => {
  const users = await userService.getUsers();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

const getUser = catchAsync(async (req, res, next) => {
  const user = await userService.getUserById(req.params.id);
  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

const updateUser = catchAsync(async (req, res, next) => {
  // Prevent users from changing their own role unless they are an admin
  if (req.body.role && req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'You do not have permission to change user roles.'));
  }
  // Prevent user from updating another user's profile unless they are an admin
  if (req.params.id !== req.user.id && req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'You do not have permission to update this user.'));
  }

  const updatedUser = await userService.updateUser(req.params.id, req.body);
  res.status(200).json({
    status: 'success',
    data: { user: updatedUser },
  });
});

const deleteUser = catchAsync(async (req, res, next) => {
  // Prevent users from deleting themselves or another user if not admin
  if (req.params.id === req.user.id) {
    return next(new AppError(403, 'You cannot delete your own account.'));
  }
  if (req.user.role !== 'ADMIN') {
    return next(new AppError(403, 'You do not have permission to delete users.'));
  }

  await userService.deleteUser(req.params.id);
  res.status(204).json({
    status: 'success',
    data: null,
  });
});

module.exports = {
  getAllUsers,
  getUser,
  updateUser,
  deleteUser,
};
```