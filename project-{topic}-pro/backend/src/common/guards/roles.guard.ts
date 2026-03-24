```typescript
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum'; // Assuming you have roles defined

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get the required roles from the metadata set by @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // No roles specified, access granted
    }

    // Get the user from the request (should be populated by AuthGuard)
    const { user } = context.switchToHttp().getRequest();

    // Check if the user exists and has at least one of the required roles
    return user && user.roles && requiredRoles.some((role) => user.roles.includes(role));
  }
}
```