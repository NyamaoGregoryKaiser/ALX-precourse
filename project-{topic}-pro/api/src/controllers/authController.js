```javascript
const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { generateAuthTokens } = require('../utils/jwt');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

/**
 * Register a new user
 */
const register = catchAsync(async (req, res) => {
  const user = await userService.createUser(req.body);
  const tokens = await generateAuthTokens(user);
  logger.info(`User registered: ${user.email}`);
  res.status(httpStatus.CREATED).send({ user: user.toJSON(), tokens });
});

/**
 * Log in a user
 */
const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await userService.getUserByEmail(email);

  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }

  // Update last login time
  user.lastLoginAt = new Date();
  await user.save();

  const tokens = await generateAuthTokens(user);
  logger.info(`User logged in: ${user.email}`);
  res.send({ user: user.toJSON(), tokens });
});

/**
 * Log out a user (refresh token invalidation would go here, not implemented directly in this example)
 */
const logout = catchAsync(async (req, res) => {
  // In a real application, you'd typically blacklist the access token (short-lived anyway)
  // and invalidate the refresh token in your token store (e.g., Redis).
  // For simplicity, we just send a success message.
  logger.info(`User ID ${req.user.id} logged out (access token effectively invalidated).`);
  res.status(httpStatus.NO_CONTENT).send();
});

/**
 * Refresh authentication tokens
 */
const refreshTokens = catchAsync(async (req, res) => {
  // In a full implementation, you'd verify the refresh token against a database/Redis store
  // and then generate new access and refresh tokens.
  // For this example, we'll simplify and re-generate based on the user from the refresh token.
  // This assumes the `authMiddleware` has already verified the refresh token.
  const user = await userService.getUserById(req.user.id); // req.user is set by jwt strategy
  if (!user) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token');
  }
  const tokens = await generateAuthTokens(user);
  logger.info(`Tokens refreshed for user: ${user.email}`);
  res.send({ user: user.toJSON(), tokens });
});


module.exports = {
  register,
  login,
  logout,
  refreshTokens,
};
```