const jwt = require('jsonwebtoken');
const config = require('../config');
const { token } = require('morgan');

const generateToken = (userId, role, secret = config.jwt.secret, expiresInMinutes = config.jwt.accessExpirationMinutes) => {
  const payload = {
    sub: userId,
    role,
    iat: Math.floor(Date.now() / 1000)
  };
  return jwt.sign(payload, secret, { expiresIn: `${expiresInMinutes}m` });
};

const generateAuthTokens = (user) => {
  const accessToken = generateToken(user.id, user.role);
  // For a full production system, you'd also generate a refresh token and store it securely.
  // For simplicity, we'll only return an access token for this example.
  // const refreshToken = generateToken(user.id, user.role, config.jwt.secret, config.jwt.refreshExpirationDays * 24 * 60);
  return {
    accessToken
    // refreshToken
  };
};

const verifyToken = (token, secret = config.jwt.secret) => {
  return jwt.verify(token, secret);
};

module.exports = {
  generateToken,
  generateAuthTokens,
  verifyToken
};