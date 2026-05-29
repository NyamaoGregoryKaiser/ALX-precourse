```javascript
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { TOKEN_TYPES } = require('../config/constants');
const logger = require('../config/logger');

/**
 * Generate JWT token
 * @param {string} userId
 * @param {moment.Moment} expires
 * @param {string} type
 * @param {string} [secret]
 * @returns {string}
 */
const generateToken = (userId, expires, type, secret = config.jwt.secret) => {
  const payload = {
    sub: userId, // Subject (user ID)
    iat: Math.floor(Date.now() / 1000), // Issued at
    exp: expires, // Expiration time
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Generate auth tokens (access and refresh)
 * @param {User} user
 * @returns {Promise<Object>}
 */
const generateAuthTokens = async (user) => {
  const accessExpires = Math.floor(Date.now() / 1000) + (config.jwt.accessExpirationMinutes * 60); // In seconds
  const accessToken = generateToken(user.id, accessExpires, TOKEN_TYPES.ACCESS);

  const refreshExpires = Math.floor(Date.now() / 1000) + (config.jwt.refreshExpirationDays * 24 * 60 * 60); // In seconds
  const refreshToken = generateToken(user.id, refreshExpires, TOKEN_TYPES.REFRESH);

  // In a production setup, you would typically save the refresh token to a database
  // associated with the user, and invalidate it upon logout.
  // For this example, we return it but don't persist its state server-side.

  logger.debug(`Generated tokens for user ${user.id}`);

  return {
    access: {
      token: accessToken,
      expires: new Date(accessExpires * 1000).toISOString(),
    },
    refresh: {
      token: refreshToken,
      expires: new Date(refreshExpires * 1000).toISOString(),
    },
  };
};

module.exports = {
  generateToken,
  generateAuthTokens,
};
```