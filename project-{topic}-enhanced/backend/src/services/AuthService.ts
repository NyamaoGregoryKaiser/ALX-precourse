```typescript
import { User } from '../entities/User';
import { UserRepository } from '../repositories/UserRepository';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import logger from '../utils/logger';

/**
 * Service layer for user authentication and authorization.
 * Handles user registration, login, and JWT token generation.
 */
export class AuthService {
  /**
   * Registers a new user.
   * @param email User's email.
   * @param password User's plain text password.
   * @param role User's role (defaults to 'user').
   * @returns The newly created user object, or null if user already exists.
   * @throws Error if registration fails.
   */
  async register(email: string, password: string, role: string = 'user'): Promise<User | null> {
    const existingUser = await UserRepository.findByEmail(email);
    if (existingUser) {
      logger.warn(`Registration failed: User with email ${email} already exists.`);
      return null; // User already exists
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is the salt rounds

    const newUser = UserRepository.create({
      email,
      password: hashedPassword,
      role,
    });

    await UserRepository.save(newUser);
    logger.info(`User registered successfully: ${email}`);
    return newUser;
  }

  /**
   * Logs in a user.
   * @param email User's email.
   * @param password User's plain text password.
   * @returns A JWT token and the user's role, or null if login fails.
   */
  async login(email: string, password: string): Promise<{ token: string; role: string } | null> {
    const user = await UserRepository.findByEmail(email);
    if (!user) {
      logger.warn(`Login failed: User not found for email ${email}.`);
      return null; // User not found
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      logger.warn(`Login failed: Invalid credentials for email ${email}.`);
      return null; // Invalid credentials
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, role: user.role }, // Payload
      config.jwtSecret,                   // Secret key
      { expiresIn: config.jwtExpiresIn }  // Token expiration
    );

    logger.info(`User logged in successfully: ${email}`);
    return { token, role: user.role };
  }
}
```