import prisma from '../utils/prisma.js';
import AppError from '../utils/appError.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

/**
 * Retrieves all users.
 * @param {object} queryOptions - Options for filtering, sorting, pagination.
 * @returns {Promise<Array>} List of users.
 */
const getAllUsers = async (queryOptions) => {
  const users = await prisma.user.findMany({
    ...queryOptions,
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return users;
};

/**
 * Retrieves a single user by ID.
 * @param {string} userId - ID of the user.
 * @returns {Promise<object>} User object.
 * @throws {AppError} If user not found.
 */
const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      teams: { // Include teams the user is a member of
        select: {
          team: {
            select: { id: true, name: true, description: true }
          },
          role: true // User's role within the team
        }
      },
      projects: { // Include projects the user owns
        select: { id: true, name: true, description: true }
      },
      tasks: { // Include tasks assigned to the user
        select: { id: true, title: true, status: true, dueDate: true }
      }
    },
  });

  if (!user) {
    throw new AppError('User not found.', 404);
  }
  return user;
};

/**
 * Updates a user.
 * @param {string} userId - ID of the user to update.
 * @param {object} updateData - Data to update.
 * @returns {Promise<object>} Updated user object.
 * @throws {AppError} If user not found or email/username already exists.
 */
const updateUser = async (userId, updateData) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  // Check for duplicate email/username if they are being updated
  if (updateData.email && updateData.email !== user.email) {
    const existingUser = await prisma.user.findUnique({ where: { email: updateData.email } });
    if (existingUser) {
      throw new AppError('Email already taken.', 409);
    }
  }
  if (updateData.username && updateData.username !== user.username) {
    const existingUser = await prisma.user.findUnique({ where: { username: updateData.username } });
    if (existingUser) {
      throw new AppError('Username already taken.', 409);
    }
  }

  if (updateData.password) {
    updateData.password = await bcrypt.hash(updateData.password, 10);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      username: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  logger.info(`User updated: ${updatedUser.email}`);
  return updatedUser;
};

/**
 * Deletes a user.
 * @param {string} userId - ID of the user to delete.
 * @returns {Promise<void>}
 * @throws {AppError} If user not found.
 */
const deleteUser = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found.', 404);
  }

  await prisma.user.delete({ where: { id: userId } });
  logger.info(`User deleted: ${userId}`);
};

/**
 * Assigns a role to a user. Only ADMIN can perform this.
 * @param {string} userId - ID of the user.
 * @param {Role} newRole - The new role to assign.
 * @returns {Promise<object>} Updated user object.
 * @throws {AppError} If user not found or role is invalid.
 */
const assignUserRole = async (userId, newRole) => {
  if (!Object.values(Role).includes(newRole)) {
    throw new AppError('Invalid role specified.', 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new AppError('User not found.', 404);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
    select: { id: true, username: true, email: true, role: true },
  });
  logger.info(`User ${updatedUser.email} role updated to ${updatedUser.role}`);
  return updatedUser;
};


export default {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  assignUserRole,
};
```

```javascript