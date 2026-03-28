import { PrismaClient, User, UserRole } from '@prisma/client';
import { hashPassword, comparePassword } from '../utils/password.util';
import { generateToken } from '../utils/jwt.util';
import { CustomError } from '../utils/errors.util';
import { logger } from '../utils/logger.util';

const prisma = new PrismaClient();

export class AuthService {
  async register(userData: Pick<User, 'name' | 'email' | 'password'>): Promise<{ user: User, token: string }> {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      logger.warn('Registration failed: User with email already exists', { email: userData.email });
      throw new CustomError('User with this email already exists', 409);
    }

    const hashedPassword = await hashPassword(userData.password);

    const newUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: UserRole.CUSTOMER, // Default role for new registrations
      },
    });

    const token = generateToken(newUser.id);
    return { user: newUser, token };
  }

  async login(email: string, password: string): Promise<{ user: User, token: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      logger.warn('Login failed: User not found', { email });
      throw new CustomError('Invalid credentials', 401);
    }

    const isMatch = await comparePassword(password, user.password);

    if (!isMatch) {
      logger.warn('Login failed: Invalid password', { email });
      throw new CustomError('Invalid credentials', 401);
    }

    const token = generateToken(user.id);
    return { user, token };
  }

  async getProfile(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return user;
  }
}