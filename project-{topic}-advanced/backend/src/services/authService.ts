```typescript
import { PrismaClient, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errorHandler';
import { config } from '../config';
import logger from '../utils/logger';
import { prisma } from '../database/prisma/client';

export interface UserRegistrationData {
  email: string;
  password: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export const generateAuthToken = (userId: string): string => {
  return jwt.sign({ id: userId }, config.jwtSecret, {
    expiresIn: config.jwtExpirationTime,
  });
};

export const registerUser = async (userData: UserRegistrationData): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { email, password, name, address, phone } = userData;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const newUser = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      address,
      phone,
      role: 'USER', // Default role for new registrations
    },
    select: {
      id: true,
      email: true,
      name: true,
      address: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const token = generateAuthToken(newUser.id);
  logger.info(`User registered successfully: ${newUser.email}`);
  return { user: newUser, token };
};

export const loginUser = async (loginData: UserLoginData): Promise<{ user: Omit<User, 'password'>; token: string }> => {
  const { email, password } = loginData;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid credentials', 401);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError('Invalid credentials', 401);
  }

  const token = generateAuthToken(user.id);
  logger.info(`User logged in successfully: ${user.email}`);

  // Exclude password from the returned user object
  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

// Example of refreshing token (optional, more complex implementation usually)
export const refreshToken = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found', 404);
  }
  const newToken = generateAuthToken(user.id);
  logger.info(`Token refreshed for user: ${user.email}`);
  return newToken;
};
```