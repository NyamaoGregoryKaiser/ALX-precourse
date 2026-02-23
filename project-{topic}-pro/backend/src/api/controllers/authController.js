```javascript
const User = require('../../models/User');
const { CustomError } = require('../../utils/error');
const asyncHandler = require('./asyncHandler'); // Custom async handler
const logger = require('../../utils/logger');

/**
 * Helper function to send token in a cookie or JSON response
 * @param {object} user - User object
 * @param {number} statusCode - HTTP status code
 * @param {object} res - Express response object
 */
const sendTokenResponse = (user, statusCode, res) => {
  const token = user.getSignedJwtToken();

  // For production, consider using httpOnly cookies for better security.
  // const options = {
  //   expires: new Date(Date.now() + config.jwtCookieExpiresIn * 24 * 60 * 60 * 1000), // e.g., 30 days
  //   httpOnly: true,
  //   secure: process.env.NODE_ENV === 'production',
  //   sameSite: 'strict'
  // };
  // res.status(statusCode).cookie('token', token, options).json({ success: true, token });

  // For this example, sending token directly in JSON for easier frontend consumption
  res.status(statusCode).json({ success: true, token, user: {
    id: user._id,
    username: user.username,
    email: user.email,
    role: user.role,
  }});
};

/**
 * @desc    Register user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  // Create user
  const user = await User.create({
    username,
    email,
    password,
    role,
  });

  logger.info(`User registered: ${user.email} with role ${user.role}`);
  sendTokenResponse(user, 201, res);
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // Check for user
  const user = await User.findOne({ email }).select('+password'); // Select password explicitly

  if (!user) {
    return next(new CustomError('Invalid credentials', 401));
  }

  // Check if password matches
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    return next(new CustomError('Invalid credentials', 401));
  }

  logger.info(`User logged in: ${user.email}`);
  sendTokenResponse(user, 200, res);
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  // req.user is populated by the protect middleware
  const user = await User.findById(req.user.id);

  if (!user) {
    return next(new CustomError('User not found', 404));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});
```