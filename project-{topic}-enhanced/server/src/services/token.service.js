const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const config = require('../config/config');
const { Token } = require('../models');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');
const { generateToken } = require('../utils/jwt');
const redisClient = require('../utils/redis');
const logger = require('../utils/logger');

/**
 * Save a token
 * @param {string} token
 * @param {string} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {boolean} [blacklisted = false]
 * @returns {Promise<Token>}
 */
const saveToken = async (token, userId, expires, type, blacklisted = false) => {
  const tokenDoc = await Token.create({
    token,
    userId,
    expires: expires.toDate(),
    type,
    blacklisted,
  });
  return tokenDoc;
};

/**
 * Verify token and return token doc (or throw an error if it is not valid)
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Token>}
 */
const verifyToken = async (token, type) => {
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const tokenDoc = await Token.findOne({
      where: { token, type, userId: payload.sub, blacklisted: false },
    });
    if (!tokenDoc) {
      logger.warn(`Token verification failed: Token not found or blacklisted (type: ${type}, user: ${payload.sub})`);
      throw new Error('Token not found or blacklisted');
    }
    return tokenDoc;
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`);
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Token verification failed');
  }
};

/**
 * Generate auth tokens
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, tokenTypes.ACCESS);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, tokenTypes.REFRESH);
  await saveToken(refreshToken, user.id, refreshTokenExpires, tokenTypes.REFRESH);

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
 * Blacklist token
 * @param {string} tokenValue
 * @param {Date} expires
 */
const blacklistToken = async (tokenValue, expires) => {
  const expirationSeconds = moment(expires).diff(moment(), 'seconds');
  if (expirationSeconds > 0) {
    await redisClient.setEx(`bl:${tokenValue}`, expirationSeconds, 'true');
    logger.info(`Token blacklisted in Redis: ${tokenValue}`);
  }
};

/**
 * Get token by value
 * @param {string} token
 * @param {string} type
 * @param {boolean} [blacklisted=false]
 * @returns {Promise<Token>}
 */
const getTokenByValue = async (token, type, blacklisted = false) => {
  return Token.findOne({ where: { token, type, blacklisted } });
};

/**
 * Delete token by ID
 * @param {string} tokenId
 * @returns {Promise<void>}
 */
const deleteTokenById = async (tokenId) => {
  const tokenDoc = await Token.findByPk(tokenId);
  if (tokenDoc) {
    await tokenDoc.destroy();
    if (tokenDoc.type === tokenTypes.REFRESH) {
      // Also blacklist the refresh token value in Redis if it's still valid
      await blacklistToken(tokenDoc.token, tokenDoc.expires);
    }
    logger.info(`Token deleted and blacklisted (if refresh): ${tokenId}`);
  }
};


module.exports = {
  generateToken,
  saveToken,
  verifyToken,
  generateAuthTokens,
  blacklistToken,
  getTokenByValue,
  deleteTokenById,
};