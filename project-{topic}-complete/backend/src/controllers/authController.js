const authService = require('../services/authService');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync'); // A helper for error handling

// Helper to wrap async controller functions for error handling
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return next(new AppError('Please provide username, email, and password.', 400));
  }

  const { user, token } = await authService.registerUser(username, email, password);

  res.status(201).json({
    status: 'success',
    message: 'User registered successfully',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password.', 400));
  }

  const { user, token } = await authService.loginUser(email, password);

  res.status(200).json({
    status: 'success',
    message: 'Logged in successfully',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});

exports.getMe = catchAsync(async (req, res, next) => {
  // req.user is set by the authenticate middleware
  res.status(200).json({
    status: 'success',
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email,
      role: req.user.role,
      profilePicture: req.user.profilePicture,
      bio: req.user.bio,
      createdAt: req.user.createdAt,
      updatedAt: req.user.updatedAt,
    },
  });
});