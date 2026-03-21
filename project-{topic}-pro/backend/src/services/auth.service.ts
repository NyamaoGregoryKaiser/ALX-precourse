```typescript
import { getRepository } from 'typeorm';
import { User, UserRole } from '@models/User';
import { hashPassword, comparePassword } from '@utils/password';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '@utils/jwt';
import AppError, { ErrorType } from '@utils/AppError';
import logger from '@config/logger';

class AuthService {
  private userRepository = getRepository(User);

  async register(username: string, email: string, passwordPlain: string, role: UserRole): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: [{ email }, { username }] });
    if (existingUser) {
      logger.warn(`Registration attempt with existing email/username: ${email}/${username}`);
      throw new AppError('User with that email or username already exists.', ErrorType.CONFLICT);
    }

    const hashedPassword = await hashPassword(passwordPlain);

    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role,
    });

    await this.userRepository.save(newUser);
    logger.info(`New user registered: ${newUser.id} (${newUser.email}) with role ${newUser.role}`);

    const accessToken = generateAccessToken({ id: newUser.id, role: newUser.role });
    const refreshToken = generateRefreshToken({ id: newUser.id, role: newUser.role });

    // In a real app, refresh tokens would be stored securely (e.g., in an HTTP-only cookie, or a database with invalidation)
    // For this example, we'll return it directly.

    return { user: newUser, accessToken, refreshToken };
  }

  async login(email: string, passwordPlain: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !(await comparePassword(passwordPlain, user.password))) {
      logger.warn(`Failed login attempt for email: ${email}`);
      throw new AppError('Invalid credentials.', ErrorType.UNAUTHORIZED);
    }

    logger.info(`User logged in: ${user.id} (${user.email})`);

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id, role: user.role });

    return { user, accessToken, refreshToken };
  }

  async refreshAccessToken(token: string): Promise<{ accessToken: string }> {
    const decoded = verifyRefreshToken(token);
    const user = await this.userRepository.findOne({ where: { id: decoded.id } });

    if (!user) {
      logger.warn(`Refresh token failed: User with ID ${decoded.id} not found.`);
      throw new AppError('Invalid refresh token.', ErrorType.UNAUTHORIZED);
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    logger.info(`Access token refreshed for user: ${user.id}`);
    return { accessToken };
  }
}

export default new AuthService();
```