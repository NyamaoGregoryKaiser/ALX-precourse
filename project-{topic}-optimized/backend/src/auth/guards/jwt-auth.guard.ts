import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * JWT Authentication Guard.
 * This guard extends the Passport 'jwt' strategy. It is used to protect routes
 * that require a valid JWT token. If the token is missing or invalid, it throws
 * an UnauthorizedException.
 *
 * Usage: `@UseGuards(JwtAuthGuard)` on controllers or specific routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  /**
   * Overrides the default `handleRequest` method from Passport's AuthGuard.
   * This allows for custom logic to process the authentication result.
   * @param err Any error that occurred during authentication.
   * @param user The user object returned by the `validate` method of the JwtStrategy.
   * @param info Additional information from Passport.
   * @returns {any} The authenticated user object.
   * @throws {UnauthorizedException} If authentication fails.
   */
  handleRequest(err: any, user: any, info: any) {
    // You can throw an exception based on the "info" object or "err" object
    if (err || !user) {
      // Log info details for debugging if needed
      // console.log('Auth Guard Info:', info);
      throw err || new UnauthorizedException('Authentication failed.');
    }
    return user;
  }

  /**
   * This method can be used to add custom logic to determine if a request
   * should be handled by this guard. E.g., skipping authentication for public routes.
   * @param context The execution context of the request.
   * @returns {boolean} True if the guard should activate, false otherwise.
   */
  // canActivate(context: ExecutionContext) {
  //   // Add your custom authentication logic here
  //   // for example, call super.logIn(request) to establish a session.
  //   return super.canActivate(context);
  // }
}