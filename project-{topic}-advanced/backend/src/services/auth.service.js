const httpStatus = require('http-status');
const userService = require('./user.service');
const tokenService = require('./token.service');
const ApiError = require('../utils/ApiError');
const { getRedisClient } = require('../config/redis.config');
const logger = require('../config/logger.config');

const loginUserWithEmailAndPassword = async (email, password) => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
  }
  return user;
};

const generateAuthTokens = async (user) => {
  const accessToken = tokenService.generateToken(user.id, 'access');
  const refreshToken = tokenService.generateToken(user.id, 'refresh');

  // Store refresh token in Redis
  try {
    const redisClient = getRedisClient();
    await redisClient.set(`refreshToken:${user.id}:${refreshToken}`, 'valid', {
      EX: tokenService.getExpirationInSeconds('refresh'),
    });
    logger.debug(`Refresh token stored for user ${user.id}`);
  } catch (error) {
    logger.error('Failed to store refresh token in Redis:', error);
    // Continue without caching if Redis is down, but log the error
  }

  return {
    access: {
      token: accessToken,
      expires: tokenService.getExpirationDate('access'),
    },
    refresh: {
      token: refreshToken,
      expires: tokenService.getExpirationDate('refresh'),
    },
  };
};

const refreshAuthTokens = async (refreshToken) => {
  try {
    const payload = tokenService.verifyToken(refreshToken);
    const user = await userService.getUserById(payload.sub);

    if (!user) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'User not found for refresh token');
    }

    // Check if refresh token is valid in Redis
    const redisClient = getRedisClient();
    const storedToken = await redisClient.get(`refreshToken:${user.id}:${refreshToken}`);

    if (!storedToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid or expired refresh token');
    }

    // Invalidate the old refresh token (optional, but good for security)
    await redisClient.del(`refreshToken:${user.id}:${refreshToken}`);
    logger.debug(`Old refresh token invalidated for user ${user.id}`);

    // Generate new tokens
    return generateAuthTokens(user);
  } catch (error) {
    // If JWT verification fails, or Redis operations fail, or token is not found/invalidated
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

module.exports = {
  loginUserWithEmailAndPassword,
  generateAuthTokens,
  refreshAuthTokens,
};