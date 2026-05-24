import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../utils/prisma.js';
import config from '../../config/config.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import { redisClient } from '../middleware/cache.js';
import { Role } from '@prisma/client';

/**
 * Generates an authentication token (access or refresh).
 * @param {string} userId - ID of the user.
 * @param {string} secret - JWT secret.
 * @param {number} expiresInMinutes - Expiration time in minutes.
 * @returns {string} JWT token.
 */
const generateToken = (userId, userRole, secret, expiresInMinutes) => {
  const payload = {
    sub: userId,
    role: userRole,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInMinutes * 60,
  };
  return jwt.sign(payload, secret);
};

/**
 * Registers a new user.
 * @param {object} userData - User registration data (username, email, password, etc.).
 * @returns {Promise<object>} Created user object (without password).
 * @throws {AppError} If user with email or username already exists.
 */
const registerUser = async (userData) => {
  const { username, email, password, firstName, lastName, role } = userData;

  // Check if username or email already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [{ username }, { email }],
    },
  });

  if (existingUser) {
    if (existingUser.email === email) {
      throw new AppError('User with this email already exists.', 409);
    }
    if (existingUser.username === username) {
      throw new AppError('User with this username already exists.', 409);
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: role || Role.USER, // Default to USER if not provided
    },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });
  logger.info(`User registered: ${newUser.email}`);
  return newUser;
};

/**
 * Logs in a user and generates JWT tokens.
 * @param {string} email - User's email.
 * @param {string} password - User's password.
 * @returns {Promise<object>} Object containing user and tokens.
 * @throws {AppError} If authentication fails.
 */
const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw new AppError('Incorrect email or password', 401);
  }

  const accessToken = generateToken(user.id, user.role, config.jwt.secret, config.jwt.accessExpirationMinutes);
  const refreshToken = generateToken(user.id, user.role, config.jwt.secret, config.jwt.refreshExpirationDays * 24 * 60);

  // Store refresh token for revocation if needed, or simply for validation in Redis
  // Here, we just set a simple entry in Redis. More robust solutions would hash the refresh token
  // and store it in the DB, or use a dedicated token blacklist.
  await redisClient.set(`refreshToken:${user.id}:${refreshToken}`, 'true', { EX: config.jwt.refreshExpirationDays * 24 * 60 * 60 });
  
  logger.info(`User logged in: ${user.email}`);
  return {
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    tokens: {
      access: {
        token: accessToken,
        expires: new Date(Date.now() + config.jwt.accessExpirationMinutes * 60 * 1000),
      },
      refresh: {
        token: refreshToken,
        expires: new Date(Date.now() + config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000),
      },
    },
  };
};

/**
 * Refreshes access token using a refresh token.
 * @param {string} refreshToken - The refresh token.
 * @returns {Promise<object>} New access token and refresh token.
 * @throws {AppError} If refresh token is invalid or expired.
 */
const refreshTokens = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret);
    const userId = payload.sub;
    const userRole = payload.role;

    // Check if the refresh token is still valid in Redis
    const storedToken = await redisClient.get(`refreshToken:${userId}:${refreshToken}`);
    if (!storedToken) {
      throw new AppError('Refresh token expired or invalid (not found in store).', 401);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found.', 401);
    }

    // Generate new access and refresh tokens
    const newAccessToken = generateToken(user.id, user.role, config.jwt.secret, config.jwt.accessExpirationMinutes);
    const newRefreshToken = generateToken(user.id, user.role, config.jwt.secret, config.jwt.refreshExpirationDays * 24 * 60);

    // Invalidate the old refresh token and store the new one
    await redisClient.del(`refreshToken:${userId}:${refreshToken}`);
    await redisClient.set(`refreshToken:${user.id}:${newRefreshToken}`, 'true', { EX: config.jwt.refreshExpirationDays * 24 * 60 * 60 });

    logger.info(`Tokens refreshed for user: ${user.email}`);
    return {
      access: {
        token: newAccessToken,
        expires: new Date(Date.now() + config.jwt.accessExpirationMinutes * 60 * 1000),
      },
      refresh: {
        token: newRefreshToken,
        expires: new Date(Date.now() + config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000),
      },
    };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Refresh token expired.', 401);
    }
    throw new AppError('Invalid refresh token.', 401);
  }
};

/**
 * Logs out a user by invalidating their refresh token.
 * @param {string} refreshToken - The refresh token to invalidate.
 * @returns {Promise<void>}
 * @throws {AppError} If token is invalid.
 */
const logoutUser = async (refreshToken) => {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret);
    const userId = payload.sub;

    const key = `refreshToken:${userId}:${refreshToken}`;
    const exists = await redisClient.exists(key);

    if (exists) {
      await redisClient.del(key);
      logger.info(`User logged out (refresh token invalidated) for userId: ${userId}`);
    } else {
      logger.warn(`Logout attempt with unknown/expired refresh token for userId: ${userId}`);
    }
  } catch (error) {
    throw new AppError('Invalid refresh token for logout.', 401);
  }
};


export default {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
};
```

```javascript