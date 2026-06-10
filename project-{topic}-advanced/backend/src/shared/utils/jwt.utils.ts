```typescript
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.config';
import { User, UserRole } from '../../database/entities/User';
import { redisClient } from '../../config/redis.config';
import { logger } from './logger';

const ACCESS_TOKEN_EXPIRATION = env.JWT_ACCESS_TOKEN_EXPIRATION;
const REFRESH_TOKEN_EXPIRATION = env.JWT_REFRESH_TOKEN_EXPIRATION;

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export const generateTokens = (user: User) => {
  const payload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRATION });
  const refreshToken = jwt.sign(payload, env.JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRATION });

  return { accessToken, refreshToken };
};

export const verifyRefreshToken = (token: string): JwtPayload | null => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    logger.error('Refresh token verification failed:', error);
    return null;
  }
};

// Store and retrieve refresh tokens (for revocation/single-use)
// In a real-world scenario, you might want to store refresh tokens in a database
// with proper invalidation/revocation mechanisms. For simplicity, we use Redis.

const REFRESH_TOKEN_KEY_PREFIX = 'refreshToken:';

export const storeRefreshToken = async (userId: string, refreshToken: string, expiresIn: string) => {
  // Convert expiresIn string (e.g., '7d') to seconds
  let expirySeconds;
  if (expiresIn.endsWith('h')) {
    expirySeconds = parseInt(expiresIn) * 3600;
  } else if (expiresIn.endsWith('d')) {
    expirySeconds = parseInt(expiresIn) * 24 * 3600;
  } else {
    // Default to 7 days if format is unexpected
    expirySeconds = 7 * 24 * 3600;
  }

  try {
    // Store the refresh token against the user ID.
    // In a more robust system, you might store multiple refresh tokens per user,
    // and associate them with a unique ID for better revocation.
    await redisClient.set(`${REFRESH_TOKEN_KEY_PREFIX}${userId}`, refreshToken, 'EX', expirySeconds);
    logger.debug(`Refresh token stored for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to store refresh token for user ${userId}:`, error);
  }
};

export const getRefreshToken = async (userId: string): Promise<string | null> => {
  try {
    const token = await redisClient.get(`${REFRESH_TOKEN_KEY_PREFIX}${userId}`);
    return token;
  } catch (error) {
    logger.error(`Failed to retrieve refresh token for user ${userId}:`, error);
    return null;
  }
};

export const deleteRefreshToken = async (userId: string) => {
  try {
    await redisClient.del(`${REFRESH_TOKEN_KEY_PREFIX}${userId}`);
    logger.debug(`Refresh token deleted for user ${userId}`);
  } catch (error) {
    logger.error(`Failed to delete refresh token for user ${userId}:`, error);
  }
};
```