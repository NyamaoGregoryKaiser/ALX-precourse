import { User } from '@/entities/User';
import { Role } from '@/entities/Role';

export type UserProfile = Omit<User, 'password' | 'emailVerificationToken' | 'passwordResetToken' | 'passwordResetExpires' | 'refreshTokens'> & { roles?: string[] };

export interface ICreateUserPayload extends Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'userRoles' | 'refreshTokens' | 'isEmailVerified' | 'emailVerificationToken' | 'passwordResetToken' | 'passwordResetExpires'> {
  roleIds?: string[]; // Optional array of role IDs to assign during creation
}

export interface IUpdateUserPayload extends Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'userRoles' | 'refreshTokens'>> {
  roleIds?: string[]; // Optional array of role IDs to update roles
}

export interface ICreateRolePayload extends Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'userRoles' | 'rolePermissions'> {
  permissionIds?: string[];
}

export interface IUpdateRolePayload extends Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'userRoles' | 'rolePermissions'>> {
  permissionIds?: string[];
}