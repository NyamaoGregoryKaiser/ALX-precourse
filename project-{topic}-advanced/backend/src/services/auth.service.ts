```typescript
import { Repository } from 'typeorm';
import { AppDataSource } from '../data-source';
import { User } from '../models/User.entity';
import bcrypt from 'bcryptjs';
import { AppError } from '../utils/appError';
import logger from '../utils/logger';

class AuthService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Registers a new user with a hashed password.
   * Throws AppError if user with email or username already exists.
   * @param username The user's chosen username.
   * @param email The user's email address.
   * @param passwordPlain The plain text password.
   * @returns The newly created User entity.
   */
  public async registerUser(username: string, email: string, passwordPlain: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({ where: [{ email }, { username }] });
    if (existingUser) {
      throw new AppError('User with this email or username already exists', 409); // Conflict
    }

    const hashedPassword = await bcrypt.hash(passwordPlain, 10);

    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: 'member', // Default role for new registrations
    });

    try {
      await this.userRepository.save(newUser);
      logger.info(`New user registered: ${newUser.email}`);
      return newUser;
    } catch (error: any) {
      logger.error(`Error registering user ${email}:`, error);
      // Re-throw as AppError to normalize error handling
      throw new AppError('Failed to register user', 500, error);
    }
  }

  /**
   * Validates user credentials for login.
   * @param email The user's email address.
   * @param passwordPlain The plain text password provided.
   * @returns The User entity if credentials are valid, otherwise null.
   */
  public async validateUser(email: string, passwordPlain: string): Promise<User | null> {
    // Select password explicitly as it's excluded by default in the entity
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'username', 'email', 'password', 'role', 'createdAt', 'updatedAt'] // Include password for comparison
    });

    if (!user) {
      logger.warn(`Login attempt failed: User not found for email ${email}`);
      return null;
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.password);

    if (!isMatch) {
      logger.warn(`Login attempt failed: Invalid password for user ${email}`);
      return null;
    }

    logger.info(`User ${user.email} successfully validated.`);
    return user;
  }
}

export default new AuthService();
```