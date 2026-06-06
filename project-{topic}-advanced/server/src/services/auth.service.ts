import { AppDataSource } from '../database/data-source';
import { User } from '../database/entities/User.entity';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/appError';
import { UserRole } from '../types/user.types';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(username: string, email: string, passwordPlain: string): Promise<User> {
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      throw new AppError('User with this email already exists', 409);
    }

    const hashedPassword = await bcrypt.hash(passwordPlain, 10);

    const user = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: UserRole.VIEWER, // Default role
    });

    await this.userRepository.save(user);
    return user;
  }

  async login(email: string, passwordPlain: string): Promise<{ token: string; user: User }> {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    const isMatch = await bcrypt.compare(passwordPlain, user.password);
    if (!isMatch) {
      throw new AppError('Invalid credentials', 401);
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' }
    );

    return { token, user };
  }
}