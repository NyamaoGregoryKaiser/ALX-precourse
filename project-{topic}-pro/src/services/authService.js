const UserService = require('./userService');
const { generateToken } = require('../utils/jwt');
const logger = require('../utils/logger');
const Joi = require('joi'); // For request body validation

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

class AuthService {
  /**
   * Registers a new user.
   * @param {object} userData - User registration data.
   * @returns {Promise<{user: User, token: string}>}
   */
  static async register(userData) {
    const { error } = registerSchema.validate(userData);
    if (error) {
      throw new Error(`Validation Error: ${error.details[0].message}`);
    }

    try {
      const user = await UserService.createUser(userData);
      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      logger.info(`User registered successfully: ${user.email}`);
      return { user, token };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw new Error(error.message || 'Registration failed.');
    }
  }

  /**
   * Logs in a user.
   * @param {string} email - User email.
   * @param {string} password - User password.
   * @returns {Promise<{user: User, token: string}>}
   */
  static async login(email, password) {
    const { error } = loginSchema.validate({ email, password });
    if (error) {
      throw new Error(`Validation Error: ${error.details[0].message}`);
    }

    try {
      const user = await UserService.findUserByEmail(email);

      if (!user) {
        throw new Error('Invalid credentials.');
      }

      const isPasswordValid = await user.validatePassword(password);

      if (!isPasswordValid) {
        throw new Error('Invalid credentials.');
      }

      const token = generateToken({ id: user.id, email: user.email, role: user.role });
      logger.info(`User logged in successfully: ${user.email}`);
      return { user, token };
    } catch (error) {
      logger.error('Login failed:', error);
      throw new Error(error.message || 'Authentication failed.');
    }
  }
}

module.exports = AuthService;