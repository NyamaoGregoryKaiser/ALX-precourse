const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('./logger');

const generateToken = (payload) => {
  try {
    return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new Error('Failed to generate token');
  }
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    logger.error('Error verifying JWT token:', error);
    throw new Error('Invalid or expired token');
  }
};

module.exports = {
  generateToken,
  verifyToken,
};