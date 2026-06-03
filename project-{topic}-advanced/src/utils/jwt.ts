```typescript
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, HttpCode } from './app-error';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const signToken = (payload: TokenPayload, secret: string, expiresIn: string): string => {
  return jwt.sign(payload, secret, {
    expiresIn,
  });
};

export const verifyToken = (token: string, secret: string): TokenPayload => {
  try {
    return jwt.verify(token, secret) as TokenPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Token has expired', HttpCode.UNAUTHORIZED);
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid token', HttpCode.UNAUTHORIZED);
    }
    throw new AppError('Failed to verify token', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const createAccessToken = (user: { id: string; email: string; role: string }): string => {
  return signToken(
    { userId: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    env.JWT_EXPIRATION_TIME
  );
};

export const createRefreshToken = (user: { id: string; email: string; role: string }): string => {
  return signToken(
    { userId: user.id, email: user.email, role: user.role },
    env.REFRESH_TOKEN_SECRET,
    env.REFRESH_TOKEN_EXPIRATION_TIME
  );
};
```