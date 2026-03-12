const jwt = require('jsonwebtoken');
const User = require('../models/user');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const registerUser = async (username, email, password) => {
  // Check if user already exists
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('User with that email already exists.', 400);
  }

  // Create new user
  const user = await User.create({ username, email, password });

  // Generate token
  const token = generateToken(user.id);

  logger.info(`User registered: ${user.email}`);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    token,
  };
};

const loginUser = async (email, password) => {
  // Check if user exists
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new AppError('Invalid credentials (email not found).', 401);
  }

  // Check password
  const isMatch = await user.matchPassword(password);

  if (!isMatch) {
    throw new AppError('Invalid credentials (password incorrect).', 401);
  }

  // Generate token
  const token = generateToken(user.id);

  logger.info(`User logged in: ${user.email}`);
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    token,
  };
};

module.exports = {
  registerUser,
  loginUser,
  generateToken,
};
```

### `backend/src/services/userService.js` (User Business Logic)
```javascript