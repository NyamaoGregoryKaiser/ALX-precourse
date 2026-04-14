import jwt from 'jsonwebtoken';
import config from '../config';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generates a JWT token for a user.
 * @param payload - The data to include in the token.
 * @returns A JWT string.
 */
export const generateToken = (payload: JWTPayload): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

/**
 * Verifies a JWT token.
 * @param token - The JWT string to verify.
 * @returns The decoded payload if valid, otherwise throws an error.
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as JWTPayload;
    return decoded;
  } catch (error) {
    throw new Error('Invalid or expired token.');
  }
};