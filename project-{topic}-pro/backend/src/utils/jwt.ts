import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User } from '../entities/User';

export interface JwtPayload {
  id: string;
  role: string; // e.g., 'user', 'merchant', 'admin'
}

export const generateToken = (user: User): string => {
  const payload: JwtPayload = {
    id: user.id,
    role: user.role,
  };
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, config.jwtSecret) as JwtPayload;
};

export const decodeToken = (token: string): JwtPayload | null => {
  return jwt.decode(token) as JwtPayload | null;
};