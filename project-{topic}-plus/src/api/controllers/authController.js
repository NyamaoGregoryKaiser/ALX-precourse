```javascript
const authService = require('../../services/authService');
const catchAsync = require('../../utils/catchAsync');
const AppError = require('../../utils/appError');
const config = require('../../config');
const logger = require('../../config/logger');

/**
 * Sets a JWT token in an HTTP-only cookie.
 * @param {string} token - The JWT token to set.
 * @param {import('express').Response} res - The Express response object.
 * @param {number} statusCode - The HTTP status code to send with the response.
 * @param {object} user - The user object to include in the response body.
 */
const createSendToken = (token, res, statusCode, user) => {
  const cookieOptions = {
    expires: new Date(
      Date.now() + config.jwt.cookieExpiresIn * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    ),
    httpOnly: true, // Prevent client-side JavaScript from accessing the cookie
    secure: config.env === 'production', // Only send cookie over HTTPS in production
    sameSite: 'Lax', // Protect against CSRF
  };

  res.cookie('jwt', token, cookieOptions);

  // Remove password from output
  const { password, ...userWithoutPassword } = user;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: userWithoutPassword,
    },
  });
};

/**
 * Handles user registration.
 */
exports.register = catchAsync(async (req, res, next) => {
  const { user, token } = await authService.register(req.body);
  logger.info(`User registered: ${user.email}`);
  createSendToken(token, res, 201, user);
});

/**
 * Handles user login.
 */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('Please provide email and password!', 400));
  }

  const { user, token } = await authService.login(email, password);
  logger.info(`User logged in: ${user.email}`);
  createSendToken(token, res, 200, user);
});

/**
 * Handles user logout.
 */
exports.logout = catchAsync(async (req, res, next) => {
  // Clear the JWT cookie by setting an expired cookie
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
  });
  logger.info(`User logged out: ${req.user ? req.user.email : 'unknown'}`);
  res.status(200).json({ status: 'success', message: 'Logged out successfully' });
});
```