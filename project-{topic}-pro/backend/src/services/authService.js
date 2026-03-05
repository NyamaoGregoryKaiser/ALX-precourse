const jwt = require('jsonwebtoken');
const httpStatus = require('http-status');
const User = require('../database/models/User');
const config = require('../config');
const { ApiError } = require('../middlewares/errorMiddleware');
const logger = require('../utils/logger');

const generateAuthTokens = (userId) => {
  const token = jwt.sign({ userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  return { token };
};

const registerUser = async (username, email, password) => {
  const existingUser = await User.findByUsername(username);
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }
  const newUser = await User.create({ username, email, password });
  logger.info(`User registered: ${newUser.username}`);
  return newUser;
};

const loginUser = async (username, password) => {
  const user = await User.findByUsername(username);
  if (!user || !(await User.comparePassword(password, user.password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  }
  logger.info(`User logged in: ${user.username}`);
  return user;
};

module.exports = {
  generateAuthTokens,
  registerUser,
  loginUser,
};