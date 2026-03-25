```typescript
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import ApiError from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import userService from './userService';
import jwt from 'jsonwebtoken';
import config from '../config';
import moment from 'moment';
import { Tokens, JwtToken } from '../types';
import { cache } from '../utils/cache';
import logger from '../utils/logger';

const userRepository = AppDataSource.getRepository(User);

const generateToken = (userId: string, expires: moment.Moment, secret: string): JwtToken => {
  const payload = {
    userId,
    iat: moment().unix(),
    exp: expires.unix(),
  };
  const token = jwt.sign(payload, secret);
  return {
    token,
    expires: expires.toDate(),
  };
};

const generateAuthTokens = async (user: User): Promise<Tokens> => {
  const accessTokenExpires = moment().add(config.jwt.accessExpirationMinutes, 'minutes');
  const accessToken = generateToken(user.id, accessTokenExpires, config.jwt.secret);

  const refreshTokenExpires = moment().add(config.jwt.refreshExpirationDays, 'days');
  const refreshToken = generateToken(user.id, refreshTokenExpires, config.jwt.secret);

  // Store refresh token or user session info in cache/DB if needed for revocation
  // For simplicity, we'll just return it. For robust revocation, store in DB or Redis.
  // Example for Redis: await cache.set(`refreshToken:${user.id}`, refreshToken.token, refreshTokenExpires.diff(moment(), 'seconds'));

  return {
    accessToken,
    refreshToken,
  };
};

const registerUser = async (userData: Partial<User>): Promise<{ user: User; tokens: Tokens }> => {
  const user = await userService.createUser(userData);
  const tokens = await generateAuthTokens(user);
  logger.info(`User registered: ${user.username}`);
  return { user, tokens };
};

const loginUserWithEmailAndPassword = async (email: string, password: string): Promise<{ user: User; tokens: Tokens }> => {
  const user = await userService.getUserByEmail(email);
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Incorrect email or password');
  }
  const tokens = await generateAuthTokens(user);
  logger.info(`User logged in: ${user.username}`);
  return { user, tokens };
};

const logout = async (token: string): Promise<void> => {
  // Blacklist the access token
  // The TTL for the blacklisted token should match the access token's expiration.
  try {
    const payload = jwt.decode(token) as AuthPayload & { exp: number };
    if (payload && payload.exp) {
      const expiresIn = payload.exp - moment().unix(); // seconds remaining
      if (expiresIn > 0) {
        await cache.set(`jwt:${token}`, 'blacklisted', expiresIn);
        logger.info(`Access token blacklisted for ${expiresIn} seconds.`);
      }
    }
  } catch (error) {
    logger.warn('Failed to decode token for logout or token already expired:', error);
  }
  // If refresh tokens were stored, invalidate them here as well.
};

const refreshAuth = async (refreshToken: string): Promise<Tokens> => {
  try {
    const payload = jwt.verify(refreshToken, config.jwt.secret) as AuthPayload;
    const user = await userService.getUserById(payload.userId);

    if (!user) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'User not found for refresh token');
    }

    // You might want to check if this refresh token is in a database/cache and still valid
    // and if it's been used before (to prevent reuse after logout/compromise)
    // For simplicity, we just verify its signature and expiration.

    return generateAuthTokens(user);
  } catch (error) {
    logger.error('Refresh token validation failed:', error);
    throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired refresh token');
  }
};


export default {
  registerUser,
  loginUserWithEmailAndPassword,
  logout,
  refreshAuth,
  generateAuthTokens,
};
```