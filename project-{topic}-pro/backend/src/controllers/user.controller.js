const userService = require('../services/user.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.getUser = catchAsync(async (req, res, next) => {
  const { id } = req.params;
  const user = await userService.getUserById(id);

  if (!user) {
    return next(new AppError('User not found', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      user,
    },
  });
});

exports.getCurrentUser = catchAsync(async (req, res, next) => {
  // req.user is set by the protect middleware
  if (!req.user) {
    return next(new AppError('No user found after authentication.', 401));
  }
  res.status(200).json({
    status: 'success',
    data: {
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
        updatedAt: req.user.updatedAt,
      },
    },
  });
});