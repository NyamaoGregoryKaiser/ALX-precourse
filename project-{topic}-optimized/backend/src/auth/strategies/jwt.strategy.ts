import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../../users/users.service';
import { UserRole } from '../../users/enums/user-role.enum';

/**
 * Interface for the JWT payload.
 * Defines the structure of the data encoded within the JWT.
 */
export interface JwtPayload {
  username: string;
  sub: string; // User ID
  roles: UserRole[];
}

/**
 * JwtStrategy is responsible for validating JWT tokens.
 * It extends PassportStrategy and uses the 'jwt' strategy.
 * When a request includes a JWT, Passport uses this strategy to
 * extract, verify, and decode the token.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService, // To fetch user details if needed
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extract JWT from Authorization header
      ignoreExpiration: false, // Do not ignore token expiration
      secretOrKey: configService.get<string>('JWT_SECRET'), // Secret to verify the token signature
    });
  }

  /**
   * Validates the JWT payload.
   * This method is called after the token has been successfully extracted and verified.
   * It should return a user object that will be attached to the `req.user` object.
   * @param payload The decoded JWT payload.
   * @returns {Promise<any>} The user object to be attached to `req.user`.
   * @throws {UnauthorizedException} If the user associated with the token is not found.
   */
  async validate(payload: JwtPayload): Promise<any> {
    const user = await this.usersService.findOne(payload.sub); // Use payload.sub (user ID) to find user
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }
    // Return a subset of user data to be attached to `req.user`
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.roles,
    };
  }
}