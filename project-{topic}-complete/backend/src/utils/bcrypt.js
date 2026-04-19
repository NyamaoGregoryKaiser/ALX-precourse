const bcrypt = require('bcryptjs');
const logger = require('../config/logger');
const AppError = require('./appError');

const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

/**
 * Hashes a plain text password.
 * @param {string} password - The plain text password.
 * @returns {Promise<string>} The hashed password.
 */
const hashPassword = async (password) => {
  try {
    return await bcrypt.hash(password, SALT_ROUNDS);
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new AppError('Failed to hash password.', 500);
  }
};

/**
 * Compares a plain text password with a hashed password.
 * @param {string} plainPassword - The plain text password.
 * @param {string} hashedPassword - The hashed password from the database.
 * @returns {Promise<boolean>} True if passwords match, false otherwise.
 */
const comparePassword = async (plainPassword, hashedPassword) => {
  try {
    return await bcrypt.compare(plainPassword, hashedPassword);
  } catch (error) {
    logger.error('Error comparing password:', error);
    throw new AppError('Failed to compare password.', 500);
  }
};

module.exports = {
  hashPassword,
  comparePassword,
};