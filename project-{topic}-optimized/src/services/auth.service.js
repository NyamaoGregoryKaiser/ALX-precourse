const prisma = require('../../prisma/client');
const { hashPassword, comparePassword } = require('../utils/bcrypt.util');
const { generateAuthTokens } = require('../utils/jwt.util');
const logger = require('../utils/logger');
const { USER_ROLES } = require('../config/constants'); // Added for default role in register

/**
 * Register a new user
 * @param {object} userData - User details including username, email, password, role
 * @returns {Promise<object>} - Registered user (without password) and auth tokens
 */
const registerUser = async (userData) => {
  const { username, email, password, role = USER_ROLES.MEMBER } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const hashedPassword = await hashPassword(password);

  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      role
    },
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      createdAt: true
    }
  });

  const tokens = generateAuthTokens(newUser);

  logger.info(`User registered successfully: ${newUser.email}`);
  return { user: newUser, tokens };
};

/**
 * Log in a user
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} - Logged-in user (without password) and auth tokens
 */
const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new Error('Invalid email or password.');
  }

  const tokens = generateAuthTokens(user);

  logger.info(`User logged in successfully: ${user.email}`);
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    },
    tokens
  };
};

module.exports = {
  registerUser,
  loginUser
};