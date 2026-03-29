import jwt from 'jsonwebtoken';
import { config } from '@/config';
import { IJwtPayload } from '@/interfaces/auth.interface';

export const generateAccessToken = (userId: string, username: string, roles: string[], permissions: string[]): string => {
  const payload: IJwtPayload = { userId, username, roles, permissions };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.accessTokenExpiration });
};

export const generateRefreshToken = (userId: string): string => {
  const payload = { userId };
  return jwt.sign(payload, config.jwt.refreshSecret, { expiresIn: config.jwt.refreshTokenExpiration });
};