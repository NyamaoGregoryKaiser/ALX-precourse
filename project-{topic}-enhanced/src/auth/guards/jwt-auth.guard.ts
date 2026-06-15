```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Custom JWT Authentication Guard that extends Passport's AuthGuard.
 * This guard automatically handles JWT validation using the 'jwt' strategy.
 * If authentication fails, it throws an UnauthorizedException.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Override handleRequest to provide custom error handling.
   * If an info or err object is present, it means authentication failed.
   * We throw an UnauthorizedException in such cases.
   */
  handleRequest<TUser = any>(
    err: any,
    user: TUser,
    info: any,
    context: any,
    status?: any,
  ): TUser {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }
    return user;
  }
}
```