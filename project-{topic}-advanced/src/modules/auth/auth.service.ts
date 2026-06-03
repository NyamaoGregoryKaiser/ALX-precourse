```typescript
import { prisma } from '../../database/prisma-client';
import { hashPassword, comparePassword } from '../../utils/password-hasher';
import { AppError, HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { USER_ROLES } from '../../config/constants';

interface UserOutput {
  id: string;
  name: string;
  email: string;
  role: string;
  passwordChangedAt?: Date | null;
}

export const registerUser = async (email: string, password: string, name: string): Promise<UserOutput> => {
  try {
    // 1. Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('User with this email already exists', HttpCode.CONFLICT);
    }

    // 2. Hash password
    const hashedPassword = await hashPassword(password);

    // 3. Create user
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: USER_ROLES.USER, // Default role
      },
      select: { id: true, name: true, email: true, role: true }, // Select specific fields
    });

    logger.info(`User registered: ${newUser.email}`);
    return newUser;
  } catch (error: any) {
    // If it's an AppError, re-throw it. Otherwise, wrap it.
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in registerUser service:', error);
    throw new AppError('Could not register user', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const loginUser = async (email: string, password: string): Promise<UserOutput> => {
  try {
    // 1. Check if user exists and select password for comparison
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError('Incorrect email or password', HttpCode.UNAUTHORIZED);
    }

    // 2. Compare passwords
    const passwordMatch = await comparePassword(password, user.password);

    if (!passwordMatch) {
      throw new AppError('Incorrect email or password', HttpCode.UNAUTHORIZED);
    }

    logger.info(`User logged in: ${user.email}`);
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      passwordChangedAt: user.passwordChangedAt,
    };
  } catch (error: any) {
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('Error in loginUser service:', error);
    throw new AppError('Could not log in user', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

// Placeholder for refresh token logic if needed in the future
// export const refreshAccessToken = async (refreshToken: string): Promise<string> => {
//   try {
//     const decoded = verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
//     const user = await prisma.user.findUnique({
//       where: { id: decoded.userId },
//       select: { id: true, email: true, role: true },
//     });

//     if (!user) {
//       throw new AppError('User no longer exists', HttpCode.UNAUTHORIZED);
//     }
//     return createAccessToken(user);
//   } catch (error: any) {
//     if (error instanceof AppError) {
//       throw error;
//     }
//     logger.error('Error refreshing access token:', error);
//     throw new AppError('Invalid or expired refresh token', HttpCode.UNAUTHORIZED);
//   }
// };
```