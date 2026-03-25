```typescript
import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User';
import ApiError from '../utils/ApiError';
import { StatusCodes } from 'http-status-codes';
import logger from '../utils/logger';
import { cache } from '../utils/cache';

const userRepository = AppDataSource.getRepository(User);

const createUser = async (userData: Partial<User>): Promise<User> => {
  if (await userRepository.findOneBy({ email: userData.email })) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
  }
  if (await userRepository.findOneBy({ username: userData.username })) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Username already taken');
  }
  const user = userRepository.create(userData);
  await userRepository.save(user);
  logger.info(`User created: ${user.username}`);
  return user;
};

const getUserById = async (id: string): Promise<User | null> => {
  const cacheKey = `user:${id}`;
  return cache.wrap(cacheKey, () => userRepository.findOneBy({ id }), 300); // Cache for 5 minutes
};

const getUserByEmail = async (email: string): Promise<User | null> => {
  const cacheKey = `user:email:${email}`;
  return cache.wrap(cacheKey, () => userRepository.findOneBy({ email }), 300);
};

const getUserByUsername = async (username: string): Promise<User | null> => {
  const cacheKey = `user:username:${username}`;
  return cache.wrap(cacheKey, () => userRepository.findOneBy({ username }), 300);
};

const updateUserById = async (id: string, updateBody: Partial<User>): Promise<User | null> => {
  const user = await userRepository.findOneBy({ id });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }

  // Check if email or username is already taken by another user
  if (updateBody.email && updateBody.email !== user.email && await userRepository.findOneBy({ email: updateBody.email })) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.username && updateBody.username !== user.username && await userRepository.findOneBy({ username: updateBody.username })) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Username already taken');
  }

  Object.assign(user, updateBody);
  await userRepository.save(user);
  await cache.del(`user:${id}`); // Invalidate cache
  await cache.del(`user:email:${user.email}`);
  await cache.del(`user:username:${user.username}`);
  logger.info(`User updated: ${user.username}`);
  return user;
};

const deleteUserById = async (id: string): Promise<void> => {
  const user = await userRepository.findOneBy({ id });
  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'User not found');
  }
  await userRepository.remove(user);
  await cache.del(`user:${id}`); // Invalidate cache
  await cache.del(`user:email:${user.email}`);
  await cache.del(`user:username:${user.username}`);
  logger.info(`User deleted: ${user.username}`);
};

export default {
  createUser,
  getUserById,
  getUserByEmail,
  getUserByUsername,
  updateUserById,
  deleteUserById,
};
```