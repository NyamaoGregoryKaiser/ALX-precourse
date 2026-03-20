const authService = require('../services/auth.service');
const logger = require('../utils/logger');

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { user, tokens } = await authService.registerUser(req.body);
    res.status(201).json({
      message: 'User registered successfully',
      user,
      tokens
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    // Check for specific error types to return appropriate status codes
    if (error.message.includes('User with this email already exists')) {
      return res.status(409).json({ message: error.message });
    }
    next(error); // Pass other errors to the error handling middleware
  }
};

/**
 * Log in a user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await authService.loginUser(email, password);
    res.status(200).json({
      message: 'Logged in successfully',
      user,
      tokens
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    if (error.message.includes('Invalid email or password')) {
      return res.status(401).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  register,
  login
};