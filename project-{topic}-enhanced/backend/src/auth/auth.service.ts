```typescript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { PrismaClient, User } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../middleware/errorHandler';
import config from '../config';
import { JwtPayload } from '../types';
import redisClient from '../utils/redis';
import logger from '../utils/logger';

const prisma = new PrismaClient();

class AuthService {
  async register(username: string, email: string, password: string): Promise<{ user: User; token: string }> {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { username }] },
    });

    if (existingUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'User with this email or username already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    const token = this.generateToken(newUser.id, newUser.email);

    // Cache user session token (optional, for more advanced session management)
    await redisClient.set(`user:${newUser.id}:token`, token, 'EX', 60 * 60 * 24); // 24 hours

    logger.info(`User registered: ${newUser.email}`);
    return { user: newUser, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email);

    // Cache user session token
    await redisClient.set(`user:${user.id}:token`, token, 'EX', 60 * 60 * 24); // 24 hours

    logger.info(`User logged in: ${user.email}`);
    return { user, token };
  }

  private generateToken(userId: string, email: string): string {
    const payload: JwtPayload = { id: userId, email };
    return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
  }

  async logout(userId: string): Promise<void> {
    await redisClient.del(`user:${userId}:token`);
    logger.info(`User logged out: ${userId}`);
  }

  async validateToken(token: string): Promise<JwtPayload> {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
      // Optionally check if token is blacklisted or invalidated in Redis
      const cachedToken = await redisClient.get(`user:${decoded.id}:token`);
      if (!cachedToken || cachedToken !== token) {
        throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired session');
      }
      return decoded;
    } catch (error) {
      logger.warn(`Token validation failed: ${error.message}`);
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid or expired token');
    }
  }
}

export const authService = new AuthService();
```