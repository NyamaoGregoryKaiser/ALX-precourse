```typescript
import { AppDataSource } from '../../database/config/data-source';
import { User, UserRole } from '../../database/entities/User';
import * as bcrypt from 'bcryptjs';
import { generateTokens, verifyRefreshToken, storeRefreshToken, deleteRefreshToken } from '../../shared/utils/jwt.utils';
import { RegisterDto, LoginDto } from './auth.dtos';
import { CustomError } from '../../shared/errors/CustomError';
import { env } from '../../config/env.config';
import { logger } from '../../shared/utils/logger';

export class AuthService {
  private userRepository = AppDataSource.getRepository(User);

  async register(userData: RegisterDto): Promise<User> {
    const { username, email, password } = userData;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({ where: [{ username }, { email }] });
    if (existingUser) {
      const conflictField = existingUser.username === username ? 'username' : 'email';
      throw new CustomError(`User with this ${conflictField} already exists`, 409, { field: conflictField });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = this.userRepository.create({
      username,
      email,
      password: hashedPassword,
      role: UserRole.USER, // Default role
    });

    await this.userRepository.save(newUser);
    return newUser;
  }

  async login(credentials: LoginDto): Promise<{ accessToken: string; refreshToken: string; user: User }> {
    const { email, password } = credentials;

    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password') // Select password explicitly
      .where('user.email = :email', { email })
      .getOne();

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new CustomError('Invalid credentials', 401);
    }

    const { accessToken, refreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, refreshToken, env.JWT_REFRESH_TOKEN_EXPIRATION);

    return { accessToken, refreshToken, user };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; newRefreshToken: string }> {
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      throw new CustomError('Invalid or expired refresh token', 403);
    }

    // Check if the refresh token stored in Redis matches the one provided
    const storedRefreshToken = await deleteRefreshToken(decoded.userId); // Delete old one
    if (!storedRefreshToken || storedRefreshToken !== refreshToken) {
      logger.warn(`Attempt to use invalid or revoked refresh token for user ${decoded.userId}`);
      throw new CustomError('Invalid or revoked refresh token', 403);
    }

    const user = await this.userRepository.findOneBy({ id: decoded.userId });

    if (!user) {
      throw new CustomError('User not found', 404);
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
    await storeRefreshToken(user.id, newRefreshToken, env.JWT_REFRESH_TOKEN_EXPIRATION);

    return { accessToken, newRefreshToken };
  }

  async logout(userId: string): Promise<void> {
    // Invalidate the refresh token
    await deleteRefreshToken(userId);
  }
}
```