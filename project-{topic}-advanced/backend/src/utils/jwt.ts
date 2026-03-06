```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError } from './apiErrors';

interface JwtPayload {
  userId: string;
  role: string;
  type: 'access' | 'refresh' | 'resetPassword' | 'verifyEmail';
}

export const generateToken = (
  userId: string,
  role: string,
  expires: string | number,
  type: JwtPayload['type'],
  secret: string = config.jwt.secret
): string => {
  const payload: JwtPayload = { userId, role, type };
  return jwt.sign(payload, secret, { expiresIn: expires });
};

export const generateAuthTokens = (userId: string, role: string) => {
  const accessTokenExpires = `${config.jwt.accessExpirationMinutes}m`;
  const refreshTokenExpires = `${config.jwt.refreshExpirationDays}d`;

  const accessToken = generateToken(userId, role, accessTokenExpires, 'access');
  const refreshToken = generateToken(userId, role, refreshTokenExpires, 'refresh');

  return {
    accessToken,
    refreshToken,
    accessExpires: new Date(Date.now() + config.jwt.accessExpirationMinutes * 60 * 1000),
    refreshExpires: new Date(Date.now() + config.jwt.refreshExpirationDays * 24 * 60 * 60 * 1000),
  };
};

export const verifyToken = (token: string, secret: string): JwtPayload => {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      throw new UnauthorizedError('Token expired.');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new UnauthorizedError('Invalid token.');
    }
    throw new UnauthorizedError('Token verification failed.');
  }
};

export const verifyAccessToken = (token: string): JwtPayload => {
  const decoded = verifyToken(token, config.jwt.secret);
  if (decoded.type !== 'access') {
    throw new UnauthorizedError('Invalid token type.');
  }
  return decoded;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  const decoded = verifyToken(token, config.jwt.secret);
  if (decoded.type !== 'refresh') {
    throw new UnauthorizedError('Invalid token type.');
  }
  return decoded;
};
```