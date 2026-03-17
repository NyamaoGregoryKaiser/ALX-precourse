const authService = require('../services/authService');
const { ApiError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

/**
 * Handles user registration requests.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const register = async (req, res, next) => {
  try {
    const newUser = await authService.registerUser(req.body);
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    logger.error('Error in authController.register:', error);
    next(error);
  }
};

/**
 * Handles user login requests.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const login = async (req, res, next) => {
  try {
    const { id, email, role, token } = await authService.loginUser(req.body);
    res.status(200).json({
      message: 'Login successful',
      user: { id, email, role },
      token,
    });
  } catch (error) {
    logger.error('Error in authController.login:', error);
    next(error);
  }
};

module.exports = {
  register,
  login,
};