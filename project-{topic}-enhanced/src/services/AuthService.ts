```typescript
import { Repository } from 'typeorm';
import { User } from '../entities/User';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';
import { environment } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * @file Authentication service.
 *
 * Handles user registration, login, and JWT token generation.
 */

interface RegisterUserData {
  username: string;
  email: string;
  password: string;
}

interface LoginResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  constructor(private userRepository: Repository<User>) {}

  /**
   * Registers a new user.
   * @param {RegisterUserData} userData - User registration details.
   * @returns {Promise<User>} The newly created user.
   * @throws {AppError} If username or email already exists.
   */
  async register(userData: RegisterUserData): Promise<User> {
    const { username, email, password } = userData;

    // Check if username or email already exists
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        throw new AppError('Username already taken', 409);
      }
      if (existingUser.email === email) {
        throw new AppError('Email already registered', 409);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: 'user', // Default role
    });

    await this.userRepository.save(newUser);
    return newUser;
  }

  /**
   * Logs in a user, validates credentials, and generates JWT tokens.
   * @param {string} email - The user's email.
   * @param {string} password - The user's password.
   * @returns {Promise<LoginResult>} An object containing the user and JWT tokens.
   * @throws {AppError} If credentials are invalid.
   */
  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'username', 'email', 'password', 'role'], // Explicitly select password
    });

    if (!user) {
      logger.warn(`Login attempt failed for email: ${email} - User not found.`);
      throw new AppError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      logger.warn(`Login attempt failed for email: ${email} - Invalid password.`);
      throw new AppError('Invalid credentials', 401);
    }

    const accessToken = this.generateToken(user.id, user.role, environment.jwtAccessTokenExpiration);
    const refreshToken = this.generateToken(user.id, user.role, environment.jwtRefreshTokenExpiration);

    // Remove password from user object before returning
    delete user.password;

    return { user, accessToken, refreshToken };
  }

  /**
   * Generates a JWT token.
   * @param {string} userId - The ID of the user.
   * @param {'admin' | 'user'} role - The role of the user.
   * @param {string} expiresIn - The expiration time for the token (e.g., '1h', '7d').
   * @returns {string} The generated JWT token.
   */
  private generateToken(userId: string, role: 'admin' | 'user', expiresIn: string): string {
    return jwt.sign({ userId, role }, environment.jwtSecret, { expiresIn });
  }
}
```