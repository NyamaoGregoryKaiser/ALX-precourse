const User = require('../models/User')(require('../config/database'), require('sequelize'));
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');
const { UnauthorizedError, APIError } = require('../utils/errors');
const logger = require('../config/logger');

exports.registerUser = async (username, email, password, role = 'user') => {
  try {
    const user = await User.create({
      username,
      email,
      password,
      role,
    });
    return user;
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      logger.warn(`Registration attempt with duplicate email: ${email}`);
      throw new APIError('Email already in use', 409);
    }
    logger.error(`Error registering user ${email}: ${error.message}`, { error });
    throw new APIError('Failed to register user', 500);
  }
};

exports.loginUser = async (email, password) => {
  try {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      logger.warn(`Login attempt with non-existent email: ${email}`);
      throw new UnauthorizedError('Invalid credentials');
    }

    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      logger.warn(`Login attempt with incorrect password for email: ${email}`);
      throw new UnauthorizedError('Invalid credentials');
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn },
    );
    return { user, token };
  } catch (error) {
    logger.error(`Error logging in user ${email}: ${error.message}`, { error });
    throw error; // Re-throw specific errors for errorHandler to process
  }
};

// Placeholder for refreshAccessToken (for full implementation)
exports.refreshAccessToken = async (refreshToken) => {
  try {
    const decoded = jwt.verify(refreshToken, jwtConfig.refreshTokenSecret);
    const user = await User.findByPk(decoded.id);

    if (!user) {
      throw new UnauthorizedError('Invalid refresh token: User not found');
    }

    const newAccessToken = jwt.sign(
      { id: user.id, role: user.role },
      jwtConfig.secret,
      { expiresIn: jwtConfig.expiresIn },
    );

    return { accessToken: newAccessToken };
  } catch (error) {
    logger.error(`Error refreshing token: ${error.message}`, { error });
    throw new UnauthorizedError('Invalid or expired refresh token');
  }
};
```