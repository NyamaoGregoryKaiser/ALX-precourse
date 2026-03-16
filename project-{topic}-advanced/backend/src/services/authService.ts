import { AppDataSource } from '../db/data-source';
import { User, UserRole } from '../db/entities/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(username: string, email: string, password: string, role: UserRole = UserRole.USER) {
    const existingUser = await this.userRepository.findOne({ where: [{ email }, { username }] });
    if (existingUser) {
      throw new CustomError('User with that email or username already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role,
    });
    await this.userRepository.save(newUser);
    logger.info(`New user registered: ${newUser.email}`);
    return newUser;
  }

  async login(emailOrUsername: string, password: string) {
    const user = await this.userRepository.findOne({
      where: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    if (!user) {
      throw new CustomError('Invalid credentials', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new CustomError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    logger.info(`User logged in: ${user.email}`);
    return { user, token };
  }
}

export const authService = new AuthService();