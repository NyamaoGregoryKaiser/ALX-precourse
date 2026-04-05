```typescript
import jwt, { Secret, JwtPayload } from 'jsonwebtoken';
import { env } from '../config';
import { ApiError } from '../utils/api-error';
import { StatusCodes } from 'http-status-codes';

// Define a custom interface for the decoded token to include userId and role
export interface CustomJwtPayload extends JwtPayload {
  userId: string;
  role: string;
}

const JWT_SECRET: Secret = env.JWT_SECRET;
const JWT_EXPIRES_IN: string = env.JWT_EXPIRES_IN;

/**
 * Generates a JWT token for a given user.
 * @param userId - The ID of the user.
 * @param role - The role of the user (e.g., 'user', 'admin').
 * @returns A signed JWT token.
 */
export const generateJwtToken = (userId: string, role: string): string => {
  return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifies a JWT token.
 * @param token - The JWT token string.
 * @returns The decoded token payload.
 * @throws {ApiError} If the token is invalid or expired.
 */
export const verifyJwtToken = (token: string): CustomJwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as CustomJwtPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new ApiError(StatusCodes.UNAUTHORIZED, 'Invalid token');
    }
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to verify token');
  }
};
```