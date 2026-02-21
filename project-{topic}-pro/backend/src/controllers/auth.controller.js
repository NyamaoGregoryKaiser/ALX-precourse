const authService = require('../services/auth.service');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');
const { generateToken } = require('../utils/jwt');

exports.register = catchAsync(async (req, res, next) => {
  const { username, email, password } = req.body;

  const newUser = await authService.registerUser(username, email, password);

  const token = generateToken(newUser.id);

  res.status(201).json({
    status: 'success',
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    },
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const user = await authService.loginUser(email, password);

  if (!user) {
    return next(new AppError('Incorrect email or password', 401));
  }

  const token = generateToken(user.id);

  res.status(200).json({
    status: 'success',
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
  });
});