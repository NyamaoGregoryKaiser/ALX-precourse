```typescript
import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      usernameField: 'username', // Default, but explicit for clarity
    });
  }

  async validate(username: string, password_raw: string): Promise<any> {
    const user = await this.authService.validateUser(username, password_raw);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}
```