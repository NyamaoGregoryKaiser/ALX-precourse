const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('knex');
const knexConfig = require('../db/knexfile');
const config = require('../config');
const { ApiError } = require('../middleware/errorHandler');
const { validateSchema } = require('../utils/helpers');
const { createUserSchema, loginUserSchema } = require('../models/userSchema');
const logger = require('../utils/logger');

const db = knex(knexConfig[config.env]);

/**
 * Registers a new user.
 * @param {object} userData - User registration data (username, email, password, role).
 * @returns {object} - New user object (without password).
 * @throws {ApiError} If user already exists or validation fails.
 */
const registerUser = async (userData) => {
  validateSchema(createUserSchema, userData);

  const { username, email, password, role } = userData;

  // Check if user already exists
  const existingUser = await db('users').where({ email }).first();
  if (existingUser) {
    throw new ApiError(409, 'User with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    const [newUser] = await db('users').insert({
      username,
      email,
      password: hashedPassword,
      role,
    }).returning(['id', 'username', 'email', 'role', 'created_at']);

    logger.info(`User registered successfully: ${newUser.email}`);
    return newUser;
  } catch (error) {
    logger.error(`Error registering user ${email}:`, error);
    throw new ApiError(500, 'Failed to register user.');
  }
};

/**
 * Logs in a user and generates a JWT token.
 * @param {object} credentials - User login credentials (email, password).
 * @returns {object} - Object containing user id, email, role, and a JWT token.
 * @throws {ApiError} If invalid credentials.
 */
const loginUser = async (credentials) => {
  validateSchema(loginUserSchema, credentials);

  const { email, password } = credentials;

  const user = await db('users').where({ email }).first();

  if (!user) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  const isMatch = await bcrypt.compare(password, user.password);

  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials.');
  }

  const token = jwt.sign(
    { id: user.id, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiration } // e.g., '1d'
  );

  logger.info(`User logged in successfully: ${user.email}`);
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    token,
  };
};

module.exports = {
  registerUser,
  loginUser,
};