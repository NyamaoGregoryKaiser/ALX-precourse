import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../users/enums/user-role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Roles Guard for role-based access control (RBAC).
 * This guard works in conjunction with the `@Roles()` decorator.
 * It checks if the authenticated user has the required roles to access a specific route.
 *
 * Usage:
 * 1. Apply `@UseGuards(JwtAuthGuard, RolesGuard)`
 * 2. Apply `@Roles(UserRole.ADMIN, UserRole.USER)` above the controller method.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Determines if the current user can activate the route based on their roles.
   * @param context The execution context of the request.
   * @returns {boolean} True if the user has the required roles, false otherwise.
   */
  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the `@Roles()` decorator on the handler or class
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If no roles are specified, access is granted by default (authentication still applies via JwtAuthGuard)
    if (!requiredRoles) {
      return true;
    }

    // Get the user object from the request, which was attached by JwtAuthGuard
    const { user } = context.switchToHttp().getRequest();

    // Check if the user exists and if their roles array contains at least one of the required roles
    return user && user.roles && requiredRoles.some((role) => user.roles.includes(role));
  }
}