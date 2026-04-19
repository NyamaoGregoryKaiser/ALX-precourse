const User = require('../models/user');
const { generateToken } = require('../utils/jwt');
const AppError = require('../utils/appError');
const { comparePassword } = require('../utils/bcrypt'); // User model has `validPassword`

/**
 * Registers a new user.
 * @param {string} username
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: User, token: string}>}
 */
exports.registerUser = async (username, email, password) => {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('E-mail already in use.', 400);
  }

  const existingUsername = await User.findOne({ where: { username } });
  if (existingUsername) {
    throw new AppError('Username already taken.', 400);
  }

  const user = await User.create({ username, email, password }); // Password hashing handled by model hook
  const token = generateToken({ id: user.id, role: user.role });

  return { user, token };
};

/**
 * Logs in a user.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: User, token: string}>}
 */
exports.loginUser = async (email, password) => {
  const user = await User.findOne({ where: { email } });

  if (!user || !(await user.validPassword(password))) { // Use the instance method
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateToken({ id: user.id, role: user.role });

  return { user, token };
};