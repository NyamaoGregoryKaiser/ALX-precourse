```javascript
const authService = require('../services/authService');
const { asyncHandler } = require('../middleware/auth'); // Using custom asyncHandler
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config/config');

/**
 * @desc    Register user
 * @route   POST /api/v1/auth/register
 * @access  Public
 */
exports.register = asyncHandler(async (req, res, next) => {
  const { username, email, password, role } = req.body;

  const user = await authService.registerUser({ username, email, password, role });

  res.status(201).json({
    success: true,
    message: 'User registered successfully. Please log in.',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    }
  });
});

/**
 * @desc    Login user
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const { user, token } = await authService.loginUser(email, password);

  // Set token in an HttpOnly cookie
  const cookieOptions = {
    expires: new Date(Date.now() + config.jwt.expiresIn.replace('h', '') * 60 * 60 * 1000), // Convert hours to ms
    httpOnly: true,
    secure: config.env === 'production', // Use HTTPS in production
    sameSite: 'Lax', // Protect against CSRF
  };
  res.cookie('token', token, cookieOptions);

  res.status(200).json({
    success: true,
    message: 'Logged in successfully',
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    },
    // For frontend to store in local storage/redux (less secure for sensitive data)
    // token: token // Optionally send token in body for easier client-side access, though cookie is more secure
  });
});

/**
 * @desc    Get current logged in user
 * @route   GET /api/v1/auth/me
 * @access  Private
 */
exports.getMe = asyncHandler(async (req, res, next) => {
  const user = await authService.getUserById(req.user.id);

  if (!user) {
    return next(new ApiError(404, 'User not found.'));
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Log out user / clear cookie
 * @route   GET /api/v1/auth/logout
 * @access  Private
 */
exports.logout = asyncHandler(async (req, res, next) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000), // Expires in 10 seconds
    httpOnly: true,
    secure: config.env === 'production',
    sameSite: 'Lax',
  });

  res.status(200).json({
    success: true,
    data: {},
    message: 'Logged out successfully',
  });
});
```