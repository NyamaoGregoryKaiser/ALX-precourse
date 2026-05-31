import prisma from '../../config/prisma';
import { AppError } from '../../utils/appError';
import { StatusCodes } from 'http-status-codes';
import { hashPassword } from '../../utils/password';
import { User, Role } from '@prisma/client';
import { clearCache } from '../../middleware/cacheMiddleware';

// Clear cache patterns after mutations for User module
const USER_CACHE_PATTERN = '/api/v1/users';

/**
 * Creates a new user.
 * @param userData User data (email, password, firstName, lastName, role).
 * @returns The created user (excluding password).
 */
export async function createUser(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: Role;
}): Promise<Omit<User, 'password'>> {
  const existingUser = await prisma.user.findUnique({ where: { email: userData.email } });
  if (existingUser) {
    throw new AppError('User with this email already exists', StatusCodes.CONFLICT);
  }

  const hashedPassword = await hashPassword(userData.password);

  const newUser = await prisma.user.create({
    data: {
      ...userData,
      password: hashedPassword,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  clearCache(USER_CACHE_PATTERN);
  return newUser;
}

/**
 * Retrieves all users.
 * @returns An array of users (excluding passwords).
 */
export async function getAllUsers(): Promise<Omit<User, 'password'>[]> {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return users;
}

/**
 * Retrieves a single user by ID.
 * @param id User ID.
 * @returns The user (excluding password) or null if not found.
 */
export async function getUserById(id: string): Promise<Omit<User, 'password'> | null> {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }
  return user;
}

/**
 * Updates an existing user.
 * @param id User ID.
 * @param updateData Data to update.
 * @returns The updated user (excluding password).
 */
export async function updateUser(
  id: string,
  updateData: Partial<Omit<User, 'password' | 'createdAt' | 'updatedAt'>>
): Promise<Omit<User, 'password'>> {
  // Ensure the user exists
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  // Prevent email updates to conflict with existing emails
  if (updateData.email && updateData.email !== existingUser.email) {
    const emailConflict = await prisma.user.findUnique({ where: { email: updateData.email } });
    if (emailConflict) {
      throw new AppError('Email already in use by another user', StatusCodes.CONFLICT);
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  clearCache(USER_CACHE_PATTERN);
  clearCache(`/api/v1/users/${id}`);
  return updatedUser;
}

/**
 * Deletes a user by ID.
 * @param id User ID.
 */
export async function deleteUser(id: string): Promise<void> {
  const existingUser = await prisma.user.findUnique({ where: { id } });
  if (!existingUser) {
    throw new AppError('User not found', StatusCodes.NOT_FOUND);
  }

  // Before deleting a user, consider cascading deletes for tasks, projects etc.
  // Prisma's `onDelete: SetNull` or `onDelete: Cascade` in schema handles this.
  // For users, if a Project Manager is deleted, their projects will be orphaned or need re-assignment.
  // For simplicity, we assume Prisma schema handles referential actions.

  await prisma.user.delete({
    where: { id },
  });
  clearCache(USER_CACHE_PATTERN);
  clearCache(`/api/v1/users/${id}`);
}
```