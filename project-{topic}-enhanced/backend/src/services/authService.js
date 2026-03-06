```javascript
import bcrypt from 'bcryptjs';
import httpStatus from 'http-status';
import { v4 as uuidv4 } from 'uuid';
import userRepository from '../repositories/userRepository.js';
import tokenService from './tokenService.js';
import ApiError from '../utils/ApiError.js';
import logger from '../config/logger.js';
import cache from '../utils/cache.js';

/**
 * Service for user authentication and authorization.
 */
class AuthService {
  /**
   * Registers a new user.
   * @param {object} userData - User registration data (username, email, password).
   * @returns {Promise<object>} The new user object and authentication tokens.
   * @throws {ApiError} If email or username already exists.
   */
  async register(userData) {
    const { username, email, password } = userData;
    logger.info(`Attempting to register user: ${email}`);

    // Validate if user exists
    if (await userRepository.findUserByEmail(email)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
    }
    if (await userRepository.findUserByUsername(username)) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await userRepository.createUser({
      id: uuidv4(), // Generate UUID for user ID
      username,
      email,
      passwordHash,
    });

    // Generate tokens
    const tokens = tokenService.generateAuthTokens(user.id);
    logger.info(`User ${user.email} registered and tokens generated.`);

    // Store refresh token in cache (or DB for persistent sessions)
    // For this example, we'll store it in cache with user ID as key
    await cache.set(`refreshToken:${user.id}`, tokens.refreshToken.token, tokens.refreshToken.expiresIn);

    return { user, tokens };
  }

  /**
   * Logs in a user.
   * @param {string} email - User's email.
   * @param {string} password - User's password.
   * @returns {Promise<object>} The user object and authentication tokens.
   * @throws {ApiError} If login fails.
   */
  async login(email, password) {
    logger.info(`Attempting to log in user: ${email}`);
    const user = await userRepository.findUserByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
    }

    // Generate new tokens
    const tokens = tokenService.generateAuthTokens(user.id);
    logger.info(`User ${user.email} logged in and new tokens generated.`);

    // Update refresh token in cache
    await cache.set(`refreshToken:${user.id}`, tokens.refreshToken.token, tokens.refreshToken.expiresIn);

    return { user: { id: user.id, username: user.username, email: user.email }, tokens };
  }

  /**
   * Refreshes access token using a valid refresh token.
   * @param {string} refreshToken - The refresh token.
   * @returns {Promise<object>} New access and refresh tokens.
   * @throws {ApiError} If refresh token is invalid or expired.
   */
  async refreshAuth(refreshToken) {
    logger.info('Attempting to refresh authentication token.');
    try {
      const refreshTokenDoc = tokenService.verifyToken(refreshToken, 'refresh');

      const cachedRefreshToken = await cache.get(`refreshToken:${refreshTokenDoc.sub}`);

      if (!cachedRefreshToken || cachedRefreshToken !== refreshToken) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid refresh token or token revoked');
      }

      const user = await userRepository.findUserById(refreshTokenDoc.sub);
      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found for refresh token');
      }

      const newTokens = tokenService.generateAuthTokens(user.id);
      logger.info(`Tokens refreshed for user ID: ${user.id}`);

      // Update refresh token in cache
      await cache.set(`refreshToken:${user.id}`, newTokens.refreshToken.token, newTokens.refreshToken.expiresIn);

      return { user, tokens: newTokens };
    } catch (error) {
      logger.error('Error refreshing token:', error.message);
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
    }
  }

  /**
   * Logs out a user by revoking their refresh token.
   * @param {string} userId - The ID of the user to log out.
   * @returns {Promise<void>}
   */
  async logout(userId) {
    logger.info(`Attempting to log out user ID: ${userId}`);
    await cache.del(`refreshToken:${userId}`);
    logger.info(`User ID ${userId} logged out.`);
  }

  /**
   * Checks if an email is already taken.
   * @param {string} email - The email to check.
   * @returns {Promise<boolean>} True if email exists, false otherwise.
   */
  async isEmailTaken(email) {
    return !!(await userRepository.findUserByEmail(email));
  }

  /**
   * Checks if a username is already taken.
   * @param {string} username - The username to check.
   * @returns {Promise<boolean>} True if username exists, false otherwise.
   */
  async isUsernameTaken(username) {
    return !!(await userRepository.findUserByUsername(username));
  }
}

export default new AuthService();
```