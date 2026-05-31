```typescript
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: { sub: string; username: string; role: string }): Promise<User> {
    const user = await this.usersService.findOne(payload.sub); // Use findOne to load the full user object
    if (!user) {
      throw new UnauthorizedException();
    }
    // Return a subset of user data that is safe to expose in the request object
    return { id: user.id, username: user.username, email: user.email, role: user.role } as User;
  }
}
```