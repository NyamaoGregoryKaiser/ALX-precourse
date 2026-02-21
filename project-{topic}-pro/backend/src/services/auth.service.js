const { User } = require('../db/sequelize');
const AppError = require('../utils/appError');
const logger = require('../utils/logger');

exports.registerUser = async (username, email, password) => {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      throw new AppError('User with that email already exists.', 400);
    }

    const newUser = await User.create({
      username,
      email,
      passwordHash: password, // passwordHash will be hashed by a hook
    });

    logger.info(`New user registered: ${newUser.email}`);
    return newUser;
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`);
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError('Could not register user. Please try again.', 500);
  }
};

exports.loginUser = async (email, password) => {
  try {
    const user = await User.findOne({ where: { email } });

    if (!user || !(await user.correctPassword(password, user.passwordHash))) {
      return null; // Incorrect credentials
    }

    logger.info(`User logged in: ${user.email}`);
    return user;
  } catch (error) {
    logger.error(`Error logging in user: ${error.message}`);
    throw new AppError('Could not log in. Please try again.', 500);
  }
};