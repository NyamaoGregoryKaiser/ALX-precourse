```typescript
import { AppDataSource } from '../dataSource';
import { User, UserRole } from '../entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const userRepository = AppDataSource.getRepository(User);

export const registerUser = async (email: string, passwordHash: string, username: string): Promise<User> => {
  // Check if user already exists
  const existingUser = await userRepository.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const user = new User();
  user.email = email;
  user.password = passwordHash; // Hashing is done via subscriber before save
  user.username = username;
  user.role = UserRole.USER; // Default role

  try {
    return await userRepository.save(user);
  } catch (error: any) {
    logger.error(`Failed to save user: ${error.message}`, { email, username, error });
    throw new AppError('Failed to register user', 500);
  }
};

export const loginUser = async (email: string, passwordPlainText: string) => {
  const user = await userRepository.findOne({ where: { email }, select: ['id', 'email', 'password', 'username', 'role'] });

  if (!user || !(await bcrypt.compare(passwordPlainText, user.password))) {
    throw new AppError('Invalid credentials', 401);
  }

  const accessToken = generateAccessToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  return { accessToken, refreshToken, user };
};

export const refreshAccessToken = async (refreshToken: string) => {
  try {
    const decoded: any = jwt.verify(refreshToken, env.REFRESH_TOKEN_SECRET);
    const user = await userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      throw new AppError('User not found for refresh token', 401);
    }

    const newAccessToken = generateAccessToken(user.id, user.role);
    const newRefreshToken = generateRefreshToken(user.id); // Optionally rotate refresh tokens

    return { accessToken: newAccessToken, newRefreshToken: newRefreshToken };
  } catch (error: any) {
    logger.error(`Refresh token validation failed: ${error.message}`, { error });
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token expired', 401);
    }
    throw new AppError('Invalid refresh token', 401);
  }
};

const generateAccessToken = (userId: string, role: UserRole): string => {
  return jwt.sign({ id: userId, role: role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRATION_TIME,
  });
};

const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId }, env.REFRESH_TOKEN_SECRET, {
    expiresIn: env.REFRESH_TOKEN_EXPIRATION_TIME,
  });
};
```