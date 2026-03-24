```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false, // Ensure tokens expire
      secretOrKey: configService.get<string>('jwt.secret'),
    });
  }

  async validate(payload: any) {
    // payload contains information decoded from the JWT token (e.g., { email, sub, roles })
    const user = await this.usersService.findById(payload.sub); // Use 'sub' (subject) as user ID
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    // Return the user object, which will be attached to the request (e.g., req.user)
    // Exclude sensitive information like password
    const { password, ...result } = user;
    return result;
  }
}
```