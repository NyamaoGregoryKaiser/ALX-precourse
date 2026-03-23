```typescript
import { PrismaClient, User } from '@prisma/client';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../middleware/errorHandler';
import logger from '../utils/logger';
import redisClient from '../utils/redis';

const prisma = new PrismaClient();

class UserService {
  async getUserById(userId: string): Promise<User | null> {
    // Attempt to fetch from cache first
    const cachedUser = await redisClient.get(`user:${userId}`);
    if (cachedUser) {
      logger.debug(`User ${userId} fetched from cache`);
      return JSON.parse(cachedUser) as User;
    }

    // If not in cache, fetch from database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
    }

    // Cache the user for future requests (e.g., 1 hour)
    await redisClient.set(`user:${userId}`, JSON.stringify(user), 'EX', 60 * 60);
    logger.debug(`User ${userId} fetched from DB and cached`);
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        username: 'asc',
      },
    });
    return users;
  }

  // Example of updating user profile (excluding password)
  async updateUserProfile(userId: string, data: { username?: string; email?: string }): Promise<User> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        username: data.username,
        email: data.email,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!updatedUser) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'User not found for update');
    }

    // Invalidate cache for this user
    await redisClient.del(`user:${userId}`);
    logger.info(`User ${userId} profile updated and cache invalidated.`);
    return updatedUser;
  }
}

export const userService = new UserService();
```