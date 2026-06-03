```typescript
import * as userRepository from './user.repository';
import { AppError, HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { hashPassword } from '../../utils/password-hasher';
import { cacheDel, cacheGet, cacheSet } from '../../utils/redis-client';
import { CACHE_KEYS } from '../../config/constants';

interface UserUpdateData {
  name?: string;
  email?: string;
  password?: string;
}

export const getUserById = async (userId: string) => {
  try {
    const cacheKey = CACHE_KEYS.USER_BY_ID(userId);
    const cachedUser = await cacheGet(cacheKey);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await userRepository.findUserById(userId);

    if (!user) {
      throw new AppError('User not found', HttpCode.NOT_FOUND);
    }

    await cacheSet(cacheKey, user, 300); // Cache for 5 minutes
    return user;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in getUserById service for user ${userId}:`, error);
    throw new AppError('Could not retrieve user', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const updateUser = async (userId: string, updateData: UserUpdateData) => {
  try {
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }

    const updatedUser = await userRepository.updateUser(userId, updateData);

    if (!updatedUser) {
      throw new AppError('User not found or could not be updated', HttpCode.NOT_FOUND);
    }
    await cacheDel(CACHE_KEYS.USER_BY_ID(userId)); // Invalidate cache
    return updatedUser;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in updateUser service for user ${userId}:`, error);
    throw new AppError('Could not update user', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const deleteUser = async (userId: string) => {
  try {
    const deletedUser = await userRepository.deleteUser(userId);

    if (!deletedUser) {
      throw new AppError('User not found or could not be deleted', HttpCode.NOT_FOUND);
    }
    await cacheDel(CACHE_KEYS.USER_BY_ID(userId)); // Invalidate cache
    return deletedUser;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in deleteUser service for user ${userId}:`, error);
    throw new AppError('Could not delete user', HttpCode.INTERNAL_SERVER_ERROR);
  }
};
```