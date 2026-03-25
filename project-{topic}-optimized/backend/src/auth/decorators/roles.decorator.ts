import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/enums/user-role.enum';

/**
 * The key used to store and retrieve roles metadata.
 */
export const ROLES_KEY = 'roles';

/**
 * Custom decorator to specify required roles for a route or controller.
 * This decorator is used in conjunction with the `RolesGuard` to implement
 * role-based access control (RBAC).
 *
 * Usage:
 * `@Roles(UserRole.ADMIN, UserRole.MANAGER)`
 *
 * @param roles A rest parameter list of `UserRole` enums required to access the resource.
 * @returns {MethodDecorator & ClassDecorator} A decorator that sets metadata for roles.
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);