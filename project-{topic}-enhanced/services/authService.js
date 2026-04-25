```javascript
const { User } = require('../db/models');
const { AppError } = require('../utils/errorHandler');
const jwt = require('../utils/jwt');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const config = require('../config/config');

exports.registerUser = async (userData) => {
  try {
    const existingUser = await User.findOne({ where: { email: userData.email } });
    if (existingUser) {
      throw new AppError('User with that email already exists', 409);
    }
    const user = await User.create(userData); // Password hashing is handled by User model hook

    const accessToken = jwt.generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = jwt.generateRefreshToken({ id: user.id, role: user.role });

    // Store refresh token in Redis for revocation
    await cache.set(`refreshToken:${user.id}:${refreshToken}`, 'true', config.jwt.refreshExpiresIn);

    return { user, accessToken, refreshToken };
  } catch (error) {
    logger.error(`Error registering user: ${error.message}`, error);
    throw error;
  }
};

exports.loginUser = async (email, password) => {
  try {
    // Find user by email, including the password for comparison
    const user = await User.scope('withPassword').findOne({ where: { email } });

    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Incorrect email or password', 401);
    }

    const accessToken = jwt.generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = jwt.generateRefreshToken({ id: user.id, role: user.role });

    // Store new refresh token in Redis, replacing any old ones
    // In a more complex system, you might manage multiple refresh tokens per user,
    // or invalidate previous ones on new login. For simplicity, we invalidate all
    // older refresh tokens for this user upon new login by clearing relevant cache entries.
    await cache.delPattern(`refreshToken:${user.id}:*`); // Invalidate all previous refresh tokens for this user
    await cache.set(`refreshToken:${user.id}:${refreshToken}`, 'true', config.jwt.refreshExpiresIn);

    return { user, accessToken, refreshToken };
  } catch (error) {
    logger.error(`Error logging in user ${email}: ${error.message}`, error);
    throw error;
  }
};

exports.refreshAccessToken = async (token) => {
  try {
    const decoded = jwt.verifyRefreshToken(token);

    // Check if the refresh token is still valid in Redis
    const isTokenValid = await cache.get(`refreshToken:${decoded.id}:${token}`);
    if (!isTokenValid) {
      throw new AppError('Invalid or expired refresh token. Please log in again.', 401);
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      throw new AppError('User not found for this refresh token.', 401);
    }

    const newAccessToken = jwt.generateAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = jwt.generateRefreshToken({ id: user.id, role: user.role });

    // Rotate refresh token: invalidate old, set new
    await cache.del(`refreshToken:${user.id}:${token}`);
    await cache.set(`refreshToken:${user.id}:${newRefreshToken}`, 'true', config.jwt.refreshExpiresIn);

    return { accessToken: newAccessToken, newRefreshToken };
  } catch (error) {
    logger.error(`Error refreshing access token: ${error.message}`, error);
    throw new AppError('Unable to refresh access token.', 401);
  }
};

exports.logoutUser = async (token) => {
  try {
    const decoded = jwt.verifyRefreshToken(token);
    // Invalidate the refresh token in Redis
    const deletedCount = await cache.del(`refreshToken:${decoded.id}:${token}`);
    if (deletedCount === 0) {
      logger.warn(`Attempt to logout with non-existent or already invalidated refresh token: ${token}`);
      throw new AppError('Refresh token not found or already invalidated.', 404);
    }
    logger.info(`Refresh token invalidated for user ${decoded.id}`);
    return true;
  } catch (error) {
    logger.error(`Error logging out user: ${error.message}`, error);
    throw new AppError('Failed to logout.', 500);
  }
};

exports.findUserById = async (id) => {
  try {
    const user = await User.findByPk(id);
    return user;
  } catch (error) {
    logger.error(`Error finding user by ID ${id}: ${error.message}`, error);
    throw new AppError('Could not retrieve user.', 500);
  }
};
```