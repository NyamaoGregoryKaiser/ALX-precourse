```typescript
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';
import { Role, UserRole } from '../entities/Role';
import { BlacklistedToken } from '../entities/BlacklistedToken';
import { generateAuthTokens, generateToken, verifyRefreshToken } from '../utils/jwt';
import { hashPassword } from '../utils/password';
import { BadRequestError, UnauthorizedError, ConflictError, NotFoundError } from '../utils/apiErrors';
import { config } from '../config';
import { mailService } from './mail.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

class AuthService {
  private userRepository = AppDataSource.getRepository(User);
  private roleRepository = AppDataSource.getRepository(Role);
  private blacklistedTokenRepository = AppDataSource.getRepository(BlacklistedToken);

  public async registerUser(userData: Partial<User>) {
    const { email, password, firstName, lastName } = userData;

    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestError('All fields (firstName, lastName, email, password) are required.');
    }

    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      throw new ConflictError('Email already registered.');
    }

    const hashedPassword = await hashPassword(password);
    const userRole = await this.roleRepository.findOneBy({ name: UserRole.USER });

    if (!userRole) {
      logger.error('Default user role not found during registration.');
      throw new BadRequestError('Cannot register user: default role not configured.');
    }

    const verificationToken = uuidv4();
    const verificationTokenExpires = new Date(Date.now() + config.jwt.verifyEmailExpirationMinutes * 60 * 1000);

    const newUser = this.userRepository.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: userRole,
      isEmailVerified: false,
      verificationToken,
      verificationTokenExpires,
    });

    await this.userRepository.save(newUser);

    // Send email verification
    await mailService.sendVerificationEmail(newUser.email, newUser.firstName, verificationToken);

    // Filter out sensitive data before returning
    const { password: _, verificationToken: __, verificationTokenExpires: ___, ...userWithoutSensitiveData } = newUser;
    return userWithoutSensitiveData;
  }

  public async loginUser(email: string, passwordPlain: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'], // Load role information
    });

    if (!user || !(await user.comparePassword(passwordPlain))) {
      throw new UnauthorizedError('Incorrect email or password.');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedError('Please verify your email to log in.');
    }

    const tokens = generateAuthTokens(user.id, user.role.name);

    // Filter out sensitive data before returning
    const { password: _, verificationToken: __, verificationTokenExpires: ___, resetPasswordToken: ____, resetPasswordTokenExpires: _____, ...userWithoutSensitiveData } = user;
    return { user: userWithoutSensitiveData, tokens };
  }

  public async logoutUser(token: string, expiresAt: Date) {
    const blacklistedToken = this.blacklistedTokenRepository.create({
      token,
      expiresAt,
    });
    await this.blacklistedTokenRepository.save(blacklistedToken);
  }

  public async refreshAuthTokens(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);
      const user = await this.userRepository.findOne({
        where: { id: decoded.userId },
        relations: ['role'],
      });

      if (!user) {
        throw new UnauthorizedError('User not found for refresh token.');
      }

      // Check if the refresh token is also blacklisted (optional, but good for security)
      // For this simple implementation, we assume refresh tokens are single-use or handled client-side.
      // A more robust system would blacklist the used refresh token and issue a new one.

      const newTokens = generateAuthTokens(user.id, user.role.name);
      return newTokens;
    } catch (error: any) {
      // Catch specific JWT errors from verifyRefreshToken
      throw new UnauthorizedError('Invalid or expired refresh token. Please log in again.');
    }
  }

  public async forgotPassword(email: string) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      // For security, don't reveal if email exists or not
      logger.warn(`Attempted password reset for non-existent email: ${email}`);
      return; // Do nothing, but still return success to prevent enumeration attacks
    }

    const resetToken = uuidv4(); // Generate a unique token
    const resetTokenExpires = new Date(Date.now() + config.jwt.resetPasswordExpirationMinutes * 60 * 1000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordTokenExpires = resetTokenExpires;
    await this.userRepository.save(user);

    await mailService.sendResetPasswordEmail(user.email, user.firstName, resetToken);
  }

  public async resetPassword(resetToken: string, newPasswordPlain: string) {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: resetToken },
    });

    if (!user || !user.resetPasswordTokenExpires || user.resetPasswordTokenExpires < new Date()) {
      throw new BadRequestError('Invalid or expired password reset token.');
    }

    user.password = await hashPassword(newPasswordPlain);
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpires = null;
    await this.userRepository.save(user);
  }

  public async verifyEmail(verificationToken: string) {
    const user = await this.userRepository.findOne({
      where: { verificationToken },
    });

    if (!user || !user.verificationTokenExpires || user.verificationTokenExpires < new Date()) {
      throw new BadRequestError('Invalid or expired email verification token.');
    }

    user.isEmailVerified = true;
    user.verificationToken = null;
    user.verificationTokenExpires = null;
    await this.userRepository.save(user);
    return true;
  }

  public async resendVerificationEmail(email: string) {
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      throw new NotFoundError('User not found.');
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email is already verified.');
    }

    const newVerificationToken = uuidv4();
    const newVerificationTokenExpires = new Date(Date.now() + config.jwt.verifyEmailExpirationMinutes * 60 * 1000);

    user.verificationToken = newVerificationToken;
    user.verificationTokenExpires = newVerificationTokenExpires;
    await this.userRepository.save(user);

    await mailService.sendVerificationEmail(user.email, user.firstName, newVerificationToken);
    return true;
  }
}

export const authService = new AuthService();
```