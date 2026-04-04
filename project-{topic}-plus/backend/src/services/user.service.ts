```typescript
import prisma from '../prisma';
import { User, UserStatus } from '@prisma/client';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../config/winston';

class UserService {
  async getUserById(id: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id },
    });
    return user;
  }

  async searchUsers(query: string): Promise<User[]> {
    if (query.length < 1) {
      return [];
    }
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
        status: true,
      },
      take: 10, // Limit results for efficiency
    });
    return users;
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { status },
      });
      logger.info(`User ${userId} status updated to ${status}`);
      return updatedUser;
    } catch (error) {
      logger.error(`Failed to update user status for ${userId}: ${error}`);
      throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update user status');
    }
  }
}

export const userService = new UserService();
```