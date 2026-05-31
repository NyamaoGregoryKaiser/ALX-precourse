import bcrypt from 'bcrypt';
import { env } from '../config/env';
import { logger } from './logger';
import { AppError } from './appError';
import { StatusCodes } from 'http-status-codes';

const SALT_ROUNDS = env.SALT_ROUNDS;

/**
 * Hashes a plain-text password using bcrypt.
 * @param password The plain-text password to hash.
 * @returns The hashed password.
 * @throws AppError if hashing fails.
 */
export async function hashPassword(password: string): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    logger.error('Error hashing password:', error);
    throw new AppError('Failed to hash password', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}

/**
 * Compares a plain-text password with a hashed password.
 * @param plainPassword The plain-text password.
 * @param hashedPassword The hashed password.
 * @returns True if the passwords match, false otherwise.
 * @throws AppError if comparison fails.
 */
export async function comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    return isMatch;
  } catch (error) {
    logger.error('Error comparing passwords:', error);
    throw new AppError('Failed to compare passwords', StatusCodes.INTERNAL_SERVER_ERROR);
  }
}
```