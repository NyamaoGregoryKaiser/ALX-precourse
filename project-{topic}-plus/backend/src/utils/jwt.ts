import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from './logger';
import { AppError } from './appError';
import { StatusCodes } from 'http-status-codes';
import { Role } from '@prisma/client';

// Define the structure of the JWT payload
export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

/**
 * Generates a JWT token for a given user payload.
 * @param payload The data to be included in the token (user ID, email, role).
 * @returns A signed JWT token.
 * @throws AppError if token generation fails.
 */
export function generateToken(payload: JwtPayload): string {
  try {
    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
    return token;
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new AppError('Failed to generate authentication token', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Verifies a JWT token and returns its payload.
 * @param token The JWT token to verify.
 * @returns The decoded payload if the token is valid.
 * @throws AppError if token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    logger.warn('JWT verification failed:', (error as Error).message);
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Authentication token expired', StatusCodes.UNAUTHORIZED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid authentication token', StatusCodes.UNAUTHORIZED);
    }
    throw new AppError('Failed to verify authentication token', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
```