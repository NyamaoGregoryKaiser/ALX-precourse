```javascript
import jwt from 'jsonwebtoken';
import moment from 'moment';
import config from '../config/index.js';
import logger from '../config/logger.js';

/**
 * Service for generating and verifying JWT tokens.
 */
class TokenService {
  /**
   * Generates a JWT token.
   * @param {string} userId - The user ID.
   * @param {moment.Moment} expires - The expiration datetime.
   * @param {string} type - The type of token (e.g., 'access', 'refresh').
   * @param {string} [secret] - The secret key for signing. Defaults to config.jwt.secret.
   * @returns {string} The generated JWT token.
   */
  generateToken(userId, expires, type, secret = config.jwt.secret) {
    const payload = {
      sub: userId,
      iat: moment().unix(),
      exp: expires.unix(),
      type,
    };
    return jwt.sign(payload, secret);
  }

  /**
   * Generates authentication tokens (access and refresh).
   * @param {string} userId - The user ID.
   * @returns {object} An object containing access and refresh token details.
   */
  generateAuthTokens(userId) {
    const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
    const accessToken = this.generateToken(userId, accessTokenExpires, 'access');

    const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
    const refreshToken = this.generateToken(userId, refreshTokenExpires, 'refresh');

    logger.debug(`Generated tokens for user ID: ${userId}`);
    return {
      accessToken: {
        token: accessToken,
        expires: accessTokenExpires.toDate(),
        expiresIn: config.jwt.accessExpirationMinutes * 60 // in seconds
      },
      refreshToken: {
        token: refreshToken,
        expires: refreshTokenExpires.toDate(),
        expiresIn: config.jwt.refreshExpirationDays * 24 * 60 * 60 // in seconds
      },
    };
  }

  /**
   * Verifies a JWT token.
   * @param {string} token - The JWT token to verify.
   * @param {string} type - The expected type of token (e.g., 'access', 'refresh').
   * @param {string} [secret] - The secret key for verification. Defaults to config.jwt.secret.
   * @returns {object} The decoded token payload.
   * @throws {jwt.JsonWebTokenError} If the token is invalid or expired.
   */
  verifyToken(token, type, secret = config.jwt.secret) {
    const payload = jwt.verify(token, secret);
    if (payload.type !== type) {
      throw new jwt.JsonWebTokenError('Invalid token type');
    }
    return payload;
  }
}

export default new TokenService();
```