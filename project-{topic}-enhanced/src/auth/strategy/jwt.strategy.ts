```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config'; // Import ConfigService

import { User } from '../../users/entities/user.entity';
import { JwtPayload } from '../jwt-payload.interface';

/**
 * JWT Strategy for Passport.js.
 * This strategy extracts the JWT from the Authorization header,
 * validates it, and then validates the user based on the payload.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private configService: ConfigService, // Inject ConfigService
  ) {
    super({
      // Extract JWT from Authorization header as a Bearer token
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Ignore expiration if set to true (false is default and recommended)
      ignoreExpiration: false,
      // Secret key for verifying the token signature
      secretOrKey: configService.get<string>('JWT_SECRET'), // Use ConfigService to get the secret
    });
  }

  /**
   * This method is called after the JWT has been successfully validated.
   * It takes the decoded payload and returns the authenticated user object.
   * If the user is not found, an UnauthorizedException is thrown.
   *
   * @param payload The decoded JWT payload.
   * @returns The authenticated user object.
   * @throws UnauthorizedException if the user does not exist.
   */
  async validate(payload: JwtPayload): Promise<User> {
    const { username } = payload;
    const user = await this.usersRepository.findOne({ where: { username } });

    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    return user;
  }
}
```