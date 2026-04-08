const authService = require('../services/authService');
const { APIError } = require('../utils/errors');
const logger = require('../config/logger');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;
    // Only allow setting role to 'admin' if current user is admin, otherwise default to 'user'
    // For registration, we typically don't allow setting admin role directly,
    // or it's an internal API. Here, we'll force 'user' unless specific logic for admin invite.
    const userRole = (role === 'admin' && req.user && req.user.role === 'admin') ? 'admin' : 'user';

    const user = await authService.registerUser(username, email, password, userRole);
    logger.info(`User registered: ${user.email}, Role: ${user.role}`);
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return next(new APIError('Email already in use', 409));
    }
    logger.error(`Error during user registration: ${error.message}`, { error });
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.loginUser(email, password);
    logger.info(`User logged in: ${user.email}`);
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    logger.error(`Error during user login for email ${req.body.email}: ${error.message}`, { error });
    next(error);
  }
};

// Placeholder for refreshToken (for full implementation)
exports.refreshToken = async (req, res, next) => {
  try {
    // In a real application, you'd extract a refresh token from req.body or a cookie
    // and use authService.refreshAccessToken(refreshToken)
    // For this example, it's a placeholder.
    res.status(501).json({ message: 'Refresh token endpoint not fully implemented' });
  } catch (error) {
    next(error);
  }
};
```