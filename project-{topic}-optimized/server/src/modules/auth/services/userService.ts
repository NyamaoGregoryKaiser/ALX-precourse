import { AppDataSource } from '../../../database/data-source';
import { User } from '../entities/User';
import { NotFoundError } from '../../../utils/errors';
import logger from '../../../utils/logger';

const userRepository = AppDataSource.getRepository(User);

export const findAllUsers = async (): Promise<User[]> => {
  logger.debug('Fetching all users');
  return await userRepository.find();
};

export const findUserById = async (id: string): Promise<User> => {
  logger.debug(`Fetching user by ID: ${id}`);
  const user = await userRepository.findOne({ where: { id } });
  if (!user) {
    logger.warn(`User with ID ${id} not found`);
    throw new NotFoundError(`User with ID ${id} not found.`);
  }
  return user;
};

// Add more user-specific services as needed
```