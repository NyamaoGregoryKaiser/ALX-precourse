```javascript
const httpStatus = require('http-status-codes');
const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../../config/config');
const userService = require('./user.service');
const ApiError = require('../utils/apiError');
const logger = require('../utils/logger');
const redisClient = require('../config/database').redisClient;

/**
 * Generate JWT token
 * @param {string} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} secret
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Verify token and return token payload (if valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Object>}
 */
const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, config.jwt.secret);
  if (payload.type !== type) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type');
  }
  return payload;
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, 'access');

  // For refresh tokens, you would store them in a database or Redis
  // and manage their lifecycle (invalidation on logout, rotation, etc.)
  // For this example, we'll keep it simple and just generate a placeholder refresh token.
  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, 'refresh');

  // Store refresh token in Redis (example)
  // await redisClient.set(`refreshToken:${user.id}:${refreshToken}`, 'true', { EX: config.jwt.refreshExpirationDays * 24 * 60 * 60 });
  logger.info(`Generated tokens for user: ${user.id}`);

  return {
    access: {
      token: accessToken,
      expires: accessTokenExpires.toDate(),
    },
    refresh: {
      token: refreshToken,
      expires: refreshTokenExpires.toDate(),
    },
  };
};

/**
 * Login with username and password
 * @param {string} email
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

module.exports = {
  generateToken,
  verifyToken,
  generateAuthTokens,
  loginUserWithEmailAndPassword,
};
```