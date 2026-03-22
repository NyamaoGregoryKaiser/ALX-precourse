```typescript
import { AppDataSource } from '../../config/database';
import { User, UserRole } from '../../entities/User';
import { CustomError } from '../../utils/error';
import logger from '../../services/logger.service';

/**
 * Registers a new user.
 * @param email User's email.
 * @param password User's plain text password.
 * @param role User's role (optional, defaults to USER).
 * @returns {Promise<User>} The newly created user object.
 * @throws {CustomError} If user with email already exists.
 */
export const registerUser = async (email: string, password: string, role?: UserRole): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);

  const existingUser = await userRepository.findOneBy({ email });
  if (existingUser) {
    logger.warn(`Attempted registration with existing email: ${email}`);
    throw new CustomError('User with this email already exists.', 409);
  }

  const user = new User();
  user.email = email;
  user.role = role || UserRole.USER;
  await user.hashPassword(password); // Hash password before saving

  await userRepository.save(user);
  logger.info(`User registered: ${user.email} (Role: ${user.role})`);
  return user;
};

/**
 * Authenticates a user and returns the user object if credentials are valid.
 * @param email User's email.
 * @param password User's plain text password.
 * @returns {Promise<User>} The authenticated user object.
 * @throws {CustomError} If authentication fails.
 */
export const loginUser = async (email: string, password: string): Promise<User> => {
  const userRepository = AppDataSource.getRepository(User);

  const user = await userRepository.findOneBy({ email });
  if (!user) {
    logger.warn(`Login attempt failed for non-existent email: ${email}`);
    throw new CustomError('Invalid credentials.', 401);
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    logger.warn(`Login attempt failed for user ${email}: Invalid password.`);
    throw new CustomError('Invalid credentials.', 401);
  }

  logger.info(`User logged in: ${user.email}`);
  return user;
};
```

#### `backend/src/modules/users/user.controller.ts` (Example for user management)