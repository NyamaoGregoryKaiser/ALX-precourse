```typescript
import { User, Prisma } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import logger from '../utils/logger';
import { prisma } from '../database/prisma/client';

export interface UserUpdateData {
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  role?: 'USER' | 'ADMIN';
}

export const getUserById = async (userId: string): Promise<Omit<User, 'password'> | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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
  if (!user) {
    throw new AppError(`User with ID ${userId} not found`, 404);
  }
  return user;
};

export const updateUser = async (userId: string, updateData: UserUpdateData): Promise<Omit<User, 'password'>> => {
  try {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new AppError(`User with ID ${userId} not found`, 404);
    }

    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({ where: { email: updateData.email } });
      if (emailExists && emailExists.id !== userId) {
        throw new AppError('Email already in use by another user', 409);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
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
    logger.info(`User updated: ${updatedUser.email}`);
    return updatedUser;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error updating user:', error);
    throw new AppError('Failed to update user', 500);
  }
};

export const deleteUser = async (userId: string): Promise<void> => {
  try {
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      throw new AppError(`User with ID ${userId} not found`, 404);
    }
    await prisma.user.delete({ where: { id: userId } });
    logger.info(`User deleted: ID ${userId}`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error deleting user:', error);
    throw new AppError('Failed to delete user', 500);
  }
};

export const getAllUsers = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  role?: 'USER' | 'ADMIN'
): Promise<{ users: Omit<User, 'password'>[]; total: number; page: number; limit: number }> => {
  const skip = (page - 1) * limit;
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  const users = await prisma.user.findMany({
    where,
    skip,
    take: limit,
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
    orderBy: {
      createdAt: 'desc',
    },
  });

  const total = await prisma.user.count({ where });

  return { users, total, page, limit };
};
```