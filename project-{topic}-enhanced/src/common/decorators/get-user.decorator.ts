```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';

/**
 * Custom decorator to extract the authenticated user from the request object.
 * This decorator expects that the `JwtAuthGuard` has successfully processed the request
 * and attached the user object to `req.user`.
 *
 * Usage:
 * `@GetUser() user: User` in a controller method.
 */
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
```