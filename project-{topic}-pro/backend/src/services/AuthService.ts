import bcrypt from 'bcryptjs';
import { User, UserRole } from '../entities/User';
import { UserRepository } from '../repositories/UserRepository';
import { generateToken } from '../utils/jwt';
import { AppError } from '../middlewares/errorHandler';
import { config } from '../config';
import logger from '../utils/logger';

export class AuthService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async register(email: string, password: string, role: UserRole = UserRole.USER): Promise<{ user: User; token: string }> {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const existingUser = await this.userRepository.findByEmail(email);
    if (existingUser) {
      throw new AppError('User with that email already exists', 409);
    }

    const passwordHash = await bcrypt.hash(password, config.hashSaltRounds);

    const newUser = await this.userRepository.create({
      email,
      passwordHash,
      role,
    });

    const token = generateToken(newUser);
    logger.info(`User registered: ${newUser.email} with role ${newUser.role}`);

    return { user: newUser, token };
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (!email || !password) {
      throw new AppError('Email and password are required', 400);
    }

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = generateToken(user);
    logger.info(`User logged in: ${user.email}`);

    return { user, token };
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404);
    }
    // Omit sensitive data like passwordHash
    const { passwordHash, ...userWithoutHash } = user;
    return userWithoutHash as User;
  }
}