```javascript
const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../../config/config');

/**
 * Generates a JWT token.
 * @param {string} userId - The user ID for whom the token is generated.
 * @param {string} secret - The secret key for signing the token.
 * @param {number} expiresInMinutes - The expiration time in minutes.
 * @returns {string} The generated JWT token.
 */
const generateToken = (userId, secret, expiresInMinutes) => {
  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: moment().add(expiresInMinutes, 'minutes').unix(),
  };
  return jwt.sign(payload, secret);
};

/**
 * Verifies a JWT token.
 * @param {string} token - The JWT token to verify.
 * @param {string} secret - The secret key used for signing the token.
 * @returns {object} The decoded token payload.
 * @throws {Error} If the token is invalid or expired.
 */
const verifyToken = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Generates access and refresh tokens for a user.
 * @param {string} userId - The user ID.
 * @returns {object} An object containing access and refresh token details.
 */
const generateAuthTokens = (userId) => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(userId, config.jwt.secret, config.jwt.accessExpirationMinutes);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(userId, config.jwt.secret, config.jwt.refreshExpirationDays * 24 * 60); // Convert days to minutes

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
  verifyToken,
  generateAuthTokens,
};
```