const jwt = require('jsonwebtoken');
const moment = require('moment');
const config = require('../config/config');

/**
 * Generate token
 * @param {string} userId
 * @param {string} type - 'access' or 'refresh'
 * @returns {string}
 */
const generateToken = (userId, type) => {
  const secret = config.jwt.secret;
  const accessExpirationMinutes = config.jwt.accessExpirationMinutes;
  const refreshExpirationDays = config.jwt.refreshExpirationDays;

  const expirationTime = type === 'access' ? accessExpirationMinutes : refreshExpirationDays * 24 * 60; // Convert days to minutes
  const expires = moment().add(expirationTime, 'minutes');

  const payload = {
    sub: userId,
    iat: moment().unix(),
    exp: expires.unix(),
    type,
  };
  return jwt.sign(payload, secret);
};

/**
 * Get expiration date for token type
 * @param {string} type - 'access' or 'refresh'
 * @returns {Date}
 */
const getExpirationDate = (type) => {
  const accessExpirationMinutes = config.jwt.accessExpirationMinutes;
  const refreshExpirationDays = config.jwt.refreshExpirationDays;

  const expirationTime = type === 'access' ? accessExpirationMinutes : refreshExpirationDays * 24 * 60;
  return moment().add(expirationTime, 'minutes').toDate();
};

/**
 * Get expiration in seconds for token type
 * @param {string} type - 'access' or 'refresh'
 * @returns {number}
 */
const getExpirationInSeconds = (type) => {
  const accessExpirationMinutes = config.jwt.accessExpirationMinutes;
  const refreshExpirationDays = config.jwt.refreshExpirationDays;

  return type === 'access' ? accessExpirationMinutes * 60 : refreshExpirationDays * 24 * 60 * 60;
};

/**
 * Verify token
 * @param {string} token
 * @returns {Object}
 */
const verifyToken = (token) => {
  return jwt.verify(token, config.jwt.secret);
};

module.exports = {
  generateToken,
  getExpirationDate,
  getExpirationInSeconds,
  verifyToken,
};