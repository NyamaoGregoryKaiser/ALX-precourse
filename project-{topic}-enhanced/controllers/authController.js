```javascript
const Joi = require('joi');
const authService = require('../services/authService');
const logger = require('../utils/logger');
const { AppError } = require('../utils/errorHandler');

const registerSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('user', 'admin').default('user'),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

exports.register = async (req, res, next) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { user, accessToken, refreshToken } = await authService.registerUser(value);
    logger.info(`User registered: ${user.email}`);

    res.status(201).json({
      status: 'success',
      message: 'User registered successfully',
      data: { user: { id: user.id, username: user.username, email: user.email, role: user.role } },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { email, password } = value;
    const { user, accessToken, refreshToken } = await authService.loginUser(email, password);
    logger.info(`User logged in: ${user.email}`);

    res.status(200).json({
      status: 'success',
      message: 'Logged in successfully',
      data: { user: { id: user.id, username: user.username, email: user.email, role: user.role } },
      tokens: { accessToken, refreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { error, value } = refreshTokenSchema.validate(req.body);
    if (error) {
      throw new AppError(error.details[0].message, 400);
    }

    const { refreshToken } = value;
    const { accessToken, newRefreshToken } = await authService.refreshAccessToken(refreshToken);
    logger.info('Access token refreshed.');

    res.status(200).json({
      status: 'success',
      message: 'Access token refreshed successfully',
      tokens: { accessToken, refreshToken: newRefreshToken },
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken || req.headers['x-refresh-token']; // Allow refresh token in body or header
    if (!refreshToken) {
      throw new AppError('Refresh token is required for logout', 400);
    }
    await authService.logoutUser(refreshToken);
    logger.info(`User logged out: ${req.user ? req.user.email : 'unknown'}`); // req.user might not be set for logout route
    res.status(200).json({ status: 'success', message: 'Logged out successfully' });
  } catch (error) {
    next(error);
  }
};

// Example protected route to get current user profile
exports.getProfile = async (req, res, next) => {
  try {
    // req.user is populated by authMiddleware
    if (!req.user) {
      throw new AppError('User not authenticated', 401);
    }
    const user = await authService.findUserById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    res.status(200).json({
      status: 'success',
      data: { user: { id: user.id, username: user.username, email: user.email, role: user.role } },
    });
  } catch (error) {
    next(error);
  }
};
```