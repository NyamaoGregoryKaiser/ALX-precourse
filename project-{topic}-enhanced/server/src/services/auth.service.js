const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const logger = require('../utils/logger');

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    logger.warn(`Failed login attempt for email: ${email}`);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  logger.info(`User logged in: ${user.email}`);
  return user;
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserById(refreshTokenDoc.userId);
    if (!user) {
      logger.warn(`Refresh token used by non-existent user ID: ${refreshTokenDoc.userId}`);
      throw new Error();
    }
    await tokenService.deleteTokenById(refreshTokenDoc.id); // Invalidate the old refresh token
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    logger.error(`Refresh token failed: ${error.message}`);
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const tokenDoc = await tokenService.getTokenByValue(refreshToken, tokenTypes.REFRESH, false);
  if (!tokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await tokenService.deleteTokenById(tokenDoc.id);
  logger.info(`User logged out (token blacklisted): ${tokenDoc.userId}`);
};

module.exports = {
  loginUserWithEmailAndPassword,
  refreshAuth,
  logout,
};