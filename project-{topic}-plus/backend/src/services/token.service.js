```javascript
const jwt = require('jsonwebtoken');
const moment = require('moment');
const httpStatus = require('http-status');
const { config } = require('../config/config');
const ApiError = require('../utils/ApiError');
const redisClient = require('../utils/redisClient'); // For storing refresh tokens in Redis

/**
 * Generate token
 * @param {string} userId
 * @param {Moment} expires
 * @param {string} type
 * @param {string} [secret]
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
 * Save refresh token to Redis
 * @param {string} token
 * @param {string} userId
 * @param {Moment} expires
 * @returns {Promise<void>}
 */
const saveRefreshToken = async (token, userId, expires) => {
  const key = `refreshToken:${userId}:${token}`; // Unique key per token
  const expiryInSeconds = expires.diff(moment(), 'seconds');
  await redisClient.setEx(key, expiryInSeconds, token);
  // Optionally store more metadata like IP, user-agent for revoking specific tokens
};

/**
 * Verify token and return token doc (if stored in DB) or payload
 * @param {string} token
 * @param {string} type
 * @returns {Promise<Object>}
 */
const verifyToken = async (token, type) => {
  const payload = jwt.verify(token, config.jwt.secret);
  if (payload.type !== type) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid token type');
  }
  // Check if refresh token exists in Redis
  if (type === 'refresh') {
    const storedToken = await redisClient.get(`refreshToken:${payload.sub}:${token}`);
    if (!storedToken) {
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Refresh token not found or expired in store');
    }
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

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, 'refresh');

  await saveRefreshToken(refreshToken, user.id, refreshTokenExpires);

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

module.exports = {
  generateToken,
  saveRefreshToken,
  verifyToken,
  generateAuthTokens,
};
```