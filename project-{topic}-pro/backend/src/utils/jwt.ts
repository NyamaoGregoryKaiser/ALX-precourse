```typescript
import jwt from 'jsonwebtoken';
import { User } from '../database/entities/User';
import logger from './logger';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretdefaultkey';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

export interface DecodedToken {
    id: string;
    email: string;
    role: string;
    iat: number;
    exp: number;
}

export const generateToken = (user: User): string => {
    try {
        return jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );
    } catch (error) {
        logger.error('Error generating JWT token:', error);
        throw new Error('Failed to generate token');
    }
};

export const verifyToken = (token: string): DecodedToken | null => {
    try {
        return jwt.verify(token, JWT_SECRET) as DecodedToken;
    } catch (error) {
        logger.warn('Invalid or expired JWT token:', error);
        return null;
    }
};
```