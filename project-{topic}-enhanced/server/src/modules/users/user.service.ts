import { AppDataSource } from '@/config/database';
import { User } from '@/entities/User';
import { Role } from '@/entities/Role';
import { UserRole } from '@/entities/UserRole';
import { ICreateUserPayload, IUpdateUserPayload, UserProfile } from '@/interfaces/user.interface';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import logger from '@/utils/logger';

const userRepository = AppDataSource.getRepository(User);
const roleRepository = AppDataSource.getRepository(Role);
const userRoleRepository = AppDataSource.getRepository(UserRole);

/**
 * Create a user
 * @param userData - User data
 * @returns User profile
 */
export const createUser = async (userData: ICreateUserPayload): Promise<UserProfile> => {
  if (await userRepository.findOneBy({ email: userData.email })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (await userRepository.findOneBy({ username: userData.username })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }

  const user = userRepository.create(userData);
  await userRepository.save(user);

  let targetRoles: Role[] = [];
  if (userData.roleIds && userData.roleIds.length > 0) {
    targetRoles = await roleRepository.findBy({ id: userData.roleIds });
    if (targetRoles.length !== userData.roleIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'One or more specified roles do not exist.');
    }
  } else {
    // Default to 'user' role
    const defaultRole = await roleRepository.findOneBy({ name: 'user' });
    if (defaultRole) {
      targetRoles.push(defaultRole);
    }
  }

  if (targetRoles.length > 0) {
    const userRoles = targetRoles.map(role => userRoleRepository.create({ user, role }));
    await userRoleRepository.save(userRoles);
  }

  return getUserById(user.id); // Return full user profile with roles
};

/**
 * Get all users
 * @returns Array of user profiles
 */
export const getUsers = async (): Promise<UserProfile[]> => {
  const users = await userRepository.find({
    relations: ['userRoles.role'],
  });
  return users.map(user => ({
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: user.userRoles.map(ur => ur.role.name),
  }));
};

/**
 * Get user by ID
 * @param id - User ID
 * @returns User profile or null if not found
 */
export const getUserById = async (id: string): Promise<UserProfile | null> => {
  const user = await userRepository.findOne({
    where: { id },
    relations: ['userRoles.role'],
  });

  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    isEmailVerified: user.isEmailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    roles: user.userRoles.map(ur => ur.role.name),
  };
};

/**
 * Update user by ID
 * @param userId - User ID
 * @param updateBody - Update data
 * @returns Updated user profile
 */
export const updateUserById = async (userId: string, updateBody: IUpdateUserPayload): Promise<UserProfile> => {
  const user = await userRepository.findOneBy({ id: userId });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  if (updateBody.email && updateBody.email !== user.email && (await userRepository.findOneBy({ email: updateBody.email }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Email already taken');
  }
  if (updateBody.username && updateBody.username !== user.username && (await userRepository.findOneBy({ username: updateBody.username }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Username already taken');
  }

  // Update user basic fields
  Object.assign(user, updateBody);
  await userRepository.save(user);

  // Handle roles update
  if (updateBody.roleIds !== undefined) {
    await userRoleRepository.delete({ userId: user.id }); // Remove existing roles

    if (updateBody.roleIds.length > 0) {
      const newRoles = await roleRepository.findBy({ id: updateBody.roleIds });
      if (newRoles.length !== updateBody.roleIds.length) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'One or more specified roles for update do not exist.');
      }
      const newUserRoles = newRoles.map(role => userRoleRepository.create({ user, role }));
      await userRoleRepository.save(newUserRoles);
    }
  }

  return getUserById(user.id);
};

/**
 * Delete user by ID
 * @param userId - User ID
 */
export const deleteUserById = async (userId: string): Promise<void> => {
  const user = await userRepository.findOneBy({ id: userId });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }
  await userRepository.remove(user);
};