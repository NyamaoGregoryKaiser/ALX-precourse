const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');
const { jwtSecret, jwtExpiresIn, saltRounds } = require('../config/auth');
const { logger } = require('../config/logger');

/**
 * Registers a new user.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} The created user object (without password) and token.
 */
exports.registerUser = async (username, email, password) => {
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: hashedPassword,
      role: 'USER', // Default role
    },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });

  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });

  logger.info(`User registered: ${user.username} (${user.role})`);
  return { user, token };
};

/**
 * Authenticates a user and generates a JWT.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} The authenticated user object (without password) and token.
 */
exports.loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    logger.warn(`Login attempt with non-existent email: ${email}`);
    throw new Error('Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    logger.warn(`Login attempt with incorrect password for email: ${email}`);
    throw new Error('Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, role: user.role }, jwtSecret, {
    expiresIn: jwtExpiresIn,
  });

  logger.info(`User logged in: ${user.username} (${user.role})`);
  return {
    user: { id: user.id, username: user.username, email: user.email, role: user.role, createdAt: user.createdAt },
    token,
  };
};

/**
 * Gets a user by ID.
 * @param {string} userId
 * @returns {Promise<Object|null>} The user object (without password) or null.
 */
exports.getUserById = async (userId) => {
  return await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, role: true, createdAt: true },
  });
};