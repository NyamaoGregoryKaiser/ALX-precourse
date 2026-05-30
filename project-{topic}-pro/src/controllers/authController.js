const AuthService = require('../services/authService');
const logger = require('../utils/logger');

class AuthController {
  static async register(req, res, next) {
    try {
      const { user, token } = await AuthService.register(req.body);
      res.status(201).json({
        message: 'User registered successfully',
        user: user,
        token,
      });
    } catch (error) {
      logger.error('Registration failed:', error.message);
      next({ statusCode: 400, message: error.message });
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const { user, token } = await AuthService.login(email, password);
      res.status(200).json({
        message: 'Logged in successfully',
        user: user,
        token,
      });
    } catch (error) {
      logger.error('Login failed:', error.message);
      next({ statusCode: 401, message: error.message });
    }
  }

  static async getProfile(req, res, next) {
    try {
      // req.user is set by the auth middleware
      if (!req.user) {
        return res.status(404).json({ message: 'User profile not found.' });
      }
      res.status(200).json({
        message: 'User profile retrieved successfully',
        user: req.user,
      });
    } catch (error) {
      logger.error('Error fetching user profile:', error.message);
      next({ statusCode: 500, message: 'Failed to retrieve user profile.' });
    }
  }
}

module.exports = AuthController;