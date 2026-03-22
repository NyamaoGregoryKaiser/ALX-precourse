```typescript
import jwt from 'jsonwebtoken';
import config from '../config';
import { User, UserRole } from '../entities/User';

/**
 * Generates an access token for a user.
 * @param user The user object.
 * @returns {string} The generated JWT access token.
 */
export const generateAccessToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: `${config.jwt.accessExpirationMinutes}m`,
  });
};

/**
 * Generates a refresh token for a user.
 * (For a full implementation, refresh tokens would typically be stored in the DB/Redis and invalidated on logout)
 * @param user The user object.
 * @returns {string} The generated JWT refresh token.
 */
export const generateRefreshToken = (user: User): string => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: `${config.jwt.refreshExpirationDays}d`,
  });
};

/**
 * Verifies a JWT token.
 * @param token The JWT token string.
 * @returns {jwt.JwtPayload | string} The decoded payload or an error.
 */
export const verifyToken = (token: string): jwt.JwtPayload | string => {
  return jwt.verify(token, config.jwt.secret);
};
```

#### `backend/src/utils/error.ts`