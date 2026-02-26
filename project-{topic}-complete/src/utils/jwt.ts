import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_EXPIRES_IN } from '../config';
import logger from './logger';
import { AppError } from './AppError';
import { UserRole } from '../database/entities/User.entity';

interface JwtPayload {
  id: string;
  email: string;
  role: UserRole;
}

/**
 * Generates a JSON Web Token (JWT) for the given user payload.
 * @param payload - The data to include in the token (e.g., user ID, email, role).
 * @returns A signed JWT string.
 */
export const generateToken = (payload: JwtPayload): string => {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN, // e.g., '1h', '7d'
    });
  } catch (error) {
    logger.error('Error generating JWT token:', error);
    throw new AppError('Failed to generate authentication token.', 500);
  }
};

/**
 * Verifies a JSON Web Token (JWT).
 * @param token - The JWT string to verify.
 * @returns The decoded payload if the token is valid.
 * @throws AppError if the token is invalid or expired.
 */
export const verifyToken = (token: string): JwtPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Authentication token has expired.', 401, 'TokenExpired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid authentication token.', 401, 'InvalidToken');
    }
    logger.error('Error verifying JWT token:', error);
    throw new AppError('Failed to verify authentication token.', 500);
  }
};