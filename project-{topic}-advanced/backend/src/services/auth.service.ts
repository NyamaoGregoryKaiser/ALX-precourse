```typescript
import { AppDataSource } from '../data-source';
import { User } from '../entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFPIRES_IN } from '../config/env';
import { BadRequestError, UnauthorizedError } from '../middleware/errorHandler.middleware';
import { getRedisClient, deleteCache, setCache } from '../config/redis';
import logger from '../utils/logger';

const userRepository = AppDataSource.getRepository(User);

interface TokenPayload {
  id: string;
  username: string;
  email: string;
  roles: string[];
}

const signToken = (payload: TokenPayload, secret: string, expiresIn: string) => {
  return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token: string, secret: string) => {
  return jwt.verify(token, secret);
};

export const registerUser = async (username: string, email: string, password: string): Promise<User> => {
  const existingUser = await userRepository.findOne({ where: [{ username }, { email }] });
  if (existingUser) {
    throw new BadRequestError('User with that username or email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = userRepository.create({ username, email, passwordHash });
  await userRepository.save(newUser);
  logger.info(`User registered: ${newUser.username} (${newUser.id})`);
  return newUser;
};

export const loginUser = async (emailOrUsername: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> => {
  const user = await userRepository.findOne({
    where: [{ email: emailOrUsername }, { username: emailOrUsername }],
  });

  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const payload: TokenPayload = {
    id: user.id,
    username: user.username,
    email: user.email,
    roles: user.roles,
  };

  const accessToken = signToken(payload, JWT_SECRET, JWT_EXPIRES_IN);
  const refreshToken = signToken(payload, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN);

  // Store refresh token in Redis for revocation
  await setCache(`refreshToken:${user.id}:${refreshToken}`, 'active', parseInt(JWT_REFRESH_EXPIRES_IN) * 1000); // JWT_REFRESH_EXPIRES_IN should be numeric for seconds, or handle string like '7d'

  logger.info(`User logged in: ${user.username} (${user.id})`);
  return { user, accessToken, refreshToken };
};

export const refreshAccessToken = async (oldRefreshToken: string): Promise<{ accessToken: string; refreshToken: string }> => {
  try {
    const decoded: any = verifyToken(oldRefreshToken, JWT_REFRESH_SECRET);
    const userId = decoded.id;

    // Check if refresh token is still valid in Redis (not revoked)
    const storedTokenStatus = await getRedisClient().get(`refreshToken:${userId}:${oldRefreshToken}`);
    if (!storedTokenStatus) {
      throw new UnauthorizedError('Refresh token revoked or expired.');
    }

    const user = await userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedError('User not found for refresh token.');
    }

    const payload: TokenPayload = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };

    const newAccessToken = signToken(payload, JWT_SECRET, JWT_EXPIRES_IN);
    const newRefreshToken = signToken(payload, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN);

    // Invalidate old refresh token and store new one
    await deleteCache(`refreshToken:${userId}:${oldRefreshToken}`);
    await setCache(`refreshToken:${user.id}:${newRefreshToken}`, 'active', parseInt(JWT_REFRESH_EXPIRES_IN) * 1000); // Same as above

    logger.info(`Access token refreshed for user: ${user.username} (${user.id})`);
    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  } catch (error) {
    logger.error('Failed to refresh token:', error);
    throw new UnauthorizedError('Invalid or expired refresh token.');
  }
};

export const logoutUser = async (userId: string, refreshToken: string): Promise<void> => {
  await deleteCache(`refreshToken:${userId}:${refreshToken}`);
  logger.info(`User logged out: ${userId}`);
};
```