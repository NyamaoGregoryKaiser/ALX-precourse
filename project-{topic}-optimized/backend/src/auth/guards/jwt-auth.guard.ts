```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: any) {
    // Add your custom authentication logic here
    // For example, you can call super.logIn(request) to establish a session.
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on the "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication failed: Invalid or expired token.');
    }
    return user;
  }
}
```