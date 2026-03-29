import { AppDataSource } from '@/config/database';
import { Role } from '@/entities/Role';
import { Permission } from '@/entities/Permission';
import { RolePermission } from '@/entities/RolePermission';
import { ICreateRolePayload, IUpdateRolePayload } from '@/interfaces/user.interface';
import { ApiError } from '@/utils/ApiError';
import httpStatus from 'http-status';
import logger from '@/utils/logger';

const roleRepository = AppDataSource.getRepository(Role);
const permissionRepository = AppDataSource.getRepository(Permission);
const rolePermissionRepository = AppDataSource.getRepository(RolePermission);

/**
 * Create a new role
 * @param roleData - Role data
 * @returns Created role with permissions
 */
export const createRole = async (roleData: ICreateRolePayload): Promise<Role> => {
  if (await roleRepository.findOneBy({ name: roleData.name })) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already taken');
  }

  const role = roleRepository.create(roleData);
  await roleRepository.save(role);

  if (roleData.permissionIds && roleData.permissionIds.length > 0) {
    const permissions = await permissionRepository.findBy({ id: roleData.permissionIds });
    if (permissions.length !== roleData.permissionIds.length) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'One or more specified permissions do not exist.');
    }
    const rolePermissions = permissions.map(permission => rolePermissionRepository.create({ role, permission }));
    await rolePermissionRepository.save(rolePermissions);
    role.rolePermissions = rolePermissions; // Attach to the role object
  }

  return role;
};

/**
 * Get all roles
 * @returns Array of roles with associated permissions
 */
export const getRoles = async (): Promise<Role[]> => {
  return roleRepository.find({
    relations: ['rolePermissions.permission'],
  });
};

/**
 * Get role by ID
 * @param id - Role ID
 * @returns Role or null if not found
 */
export const getRoleById = async (id: string): Promise<Role | null> => {
  return roleRepository.findOne({
    where: { id },
    relations: ['rolePermissions.permission'],
  });
};

/**
 * Update role by ID
 * @param roleId - Role ID
 * @param updateBody - Update data
 * @returns Updated role
 */
export const updateRoleById = async (roleId: string, updateBody: IUpdateRolePayload): Promise<Role> => {
  const role = await roleRepository.findOneBy({ id: roleId });
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }

  if (updateBody.name && updateBody.name !== role.name && (await roleRepository.findOneBy({ name: updateBody.name }))) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Role name already taken');
  }

  Object.assign(role, updateBody);
  await roleRepository.save(role);

  // Handle permissions update
  if (updateBody.permissionIds !== undefined) {
    await rolePermissionRepository.delete({ roleId: role.id }); // Remove existing permissions

    if (updateBody.permissionIds.length > 0) {
      const newPermissions = await permissionRepository.findBy({ id: updateBody.permissionIds });
      if (newPermissions.length !== updateBody.permissionIds.length) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'One or more specified permissions for update do not exist.');
      }
      const newRolePermissions = newPermissions.map(permission => rolePermissionRepository.create({ role, permission }));
      await rolePermissionRepository.save(newRolePermissions);
    }
  }

  return getRoleById(role.id) as Promise<Role>; // Return the updated role with new permissions
};

/**
 * Delete role by ID
 * @param roleId - Role ID
 */
export const deleteRoleById = async (roleId: string): Promise<void> => {
  const role = await roleRepository.findOneBy({ id: roleId });
  if (!role) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Role not found');
  }
  await roleRepository.remove(role);
};