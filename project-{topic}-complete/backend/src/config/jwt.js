require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'fallback_jwt_secret_please_change',
  expiresIn: process.env.JWT_EXPIRES_IN || '1h',
};