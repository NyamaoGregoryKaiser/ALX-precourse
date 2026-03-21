```typescript
import jwt from 'jsonwebtoken';
import { config } from '@config/index';
import AppError, { ErrorType } from './AppError';

interface TokenPayload {
  id: string;
  role: string;
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.SECRET_KEY, { expiresIn: config.ACCESS_TOKEN_EXPIRATION });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, config.REFRESH_SECRET_KEY, { expiresIn: config.REFRESH_TOKEN_EXPIRATION });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.SECRET_KEY) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new AppError('Invalid or expired access token', ErrorType.UNAUTHORIZED);
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, config.REFRESH_SECRET_KEY) as TokenPayload;
    return decoded;
  } catch (error) {
    throw new AppError('Invalid or expired refresh token', ErrorType.UNAUTHORIZED);
  }
};
```