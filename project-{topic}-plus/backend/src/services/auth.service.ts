```typescript
import { hashPassword, comparePassword } from '../utils/hash';
import { jwtService } from './jwt.service';
import prisma from '../prisma';
import httpStatus from 'http-status';
import { ApiError } from '../middlewares/errorHandler';
import { logger } from '../config/winston';
import { User } from '@prisma/client';

class AuthService {
  async registerUser(username: string, email: string, password: string): Promise<User> {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      logger.warn(`Registration attempt with existing email or username: ${email}, ${username}`);
      throw new ApiError(httpStatus.BAD_REQUEST, 'User with this email or username already exists');
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
    });

    logger.info(`User registered successfully: ${user.email}`);
    return user;
  }

  async loginUser(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      logger.warn(`Login attempt failed for email: ${email}`);
      throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect email or password');
    }

    const token = jwtService.generateToken(user.id);
    logger.info(`User logged in: ${user.email}`);
    return { user, token };
  }
}

export const authService = new AuthService();
```