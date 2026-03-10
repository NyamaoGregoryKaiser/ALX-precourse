```javascript
const User = require('../models/user');
const ApiError = require('../utils/ApiError');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { clearCache } = require('../middleware/cache'); // Import clearCache

/**
 * Register a new user.
 * @param {object} userData - User details (username, email, password, role)
 * @returns {User} The created user object
 */
exports.registerUser = async (userData) => {
  const { username, email, password, role } = userData;

  if (!username || !email || !password) {
    throw new ApiError(400, 'Please provide username, email, and password');
  }

  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ApiError(400, 'User with that email already exists');
  }

  const user = await User.create({ username, email, password, role });
  await clearCache('users:*'); // Clear user-related cache
  return user;
};

/**
 * Login a user.
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} { user, token }
 */
exports.loginUser = async (email, password) => {
  if (!email || !password) {
    throw new ApiError(400, 'Please provide email and password');
  }

  const user = await User.findOne({ where: { email } });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials or inactive user');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

  return { user, token };
};

/**
 * Get user by ID.
 * @param {string} id - User ID
 * @returns {User} User object
 */
exports.getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ['password'] } // Exclude password from query
  });
  if (!user) {
    throw new ApiError(404, `User with id ${id} not found`);
  }
  return user;
};
```