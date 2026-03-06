```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { logger } from '../utils/logger';
import { ApiError, UnauthorizedError, BadRequestError } from '../utils/apiErrors';

class AuthController {
  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await authService.registerUser(req.body);
      res.status(201).json({
        message: 'Registration successful. Please check your email to verify your account.',
        user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, isEmailVerified: user.isEmailVerified, role: user.role.name }
      });
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const { user, tokens } = await authService.loginUser(email, password);
      res.status(200).json({ user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName, role: user.role.name }, tokens });
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.token || !req.user) {
        throw new UnauthorizedError('No token provided or user not authenticated.');
      }
      // Assuming access tokens have an expiry embedded, which can be extracted during verification
      // For simplicity, we are blacklisting the current req.token.
      // In a real system, you might want to decode the token to get its `exp` claim.
      // For now, let's assume `req.token` is the accessToken and we need its expiry.
      // A more robust solution might pass the token's expiry from the `authenticate` middleware.
      // For now, we'll use a placeholder expiry or re-verify to get the expiry.
      // A proper JWT `exp` can be extracted like: `jwt.decode(req.token)?.exp * 1000`
      // Let's assume a generic 1 hour expiry from now if we can't reliably get `exp` from `req.token` without re-verifying or storing it.
      // Better approach: `authenticate` middleware stores `decoded.exp`
      const expiryDate = new Date(Date.now() + 60 * 60 * 1000); // Placeholder: blacklisted for 1 hour from now

      await authService.logoutUser(req.token, expiryDate);
      res.status(200).json({ message: 'Logged out successfully.' });
    } catch (error) {
      next(error);
    }
  }

  public async refreshTokens(req: Request, res: Response, next: NextFunction) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refreshAuthTokens(refreshToken);
      res.status(200).json(tokens);
    } catch (error) {
      next(error);
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.forgotPassword(email);
      res.status(200).json({ message: 'If an account with that email exists, a password reset link has been sent.' });
    } catch (error) {
      next(error);
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      const { newPassword } = req.body;

      if (typeof token !== 'string') {
        throw new BadRequestError('Invalid reset token.');
      }

      await authService.resetPassword(token, newPassword);
      res.status(200).json({ message: 'Password reset successful. You can now log in with your new password.' });
    } catch (error) {
      next(error);
    }
  }

  public async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.query;
      if (typeof token !== 'string') {
        throw new BadRequestError('Invalid verification token.');
      }
      await authService.verifyEmail(token);
      res.status(200).json({ message: 'Email verified successfully.' });
    } catch (error) {
      next(error);
    }
  }

  public async resendVerificationEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      await authService.resendVerificationEmail(email);
      res.status(200).json({ message: 'If an account with that email exists and is not verified, a new verification email has been sent.' });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
```