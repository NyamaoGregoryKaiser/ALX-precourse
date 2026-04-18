```typescript
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { UserRole } from '../models/User.entity';
import { AppError } from './appError';

export interface JwtPayload {
  userId: string;
  role: UserRole;
  email: string; // Include email for convenience in frontend or logging
  iat?: number; // Issued at
  exp?: number; // Expiration time
}

/**
 * Generates a JSON Web Token (JWT) for an authenticated user.
 * @param userId The ID of the user.
 * @param role The role of the user.
 * @param email The email of the user.
 * @returns A signed JWT string.
 */
export const generateAccessToken = (userId: string, role: UserRole, email: string): string => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment configuration.');
  }
  return jwt.sign({ userId, role, email }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

/**
 * Verifies a JWT and returns its payload.
 * Throws an AppError if the token is invalid or expired.
 * @param token The JWT string to verify.
 * @returns The decoded JWT payload.
 */
export const verifyAccessToken = (token: string): JwtPayload => {
  if (!config.jwtSecret) {
    throw new Error('JWT_SECRET is not defined in environment configuration.');
  }
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    return decoded as JwtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('Authentication token expired', 401);
    }
    throw new AppError('Invalid authentication token', 403);
  }
};
```