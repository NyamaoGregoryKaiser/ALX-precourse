```typescript
import jwt from 'jsonwebtoken';
import { config } from '../config';

export const generateToken = (userId: string): string => {
    return jwt.sign({ id: userId }, config.jwt.secret, {
        expiresIn: config.jwt.expirationTime,
    });
};

export const verifyToken = (token: string): { id: string } => {
    return jwt.verify(token, config.jwt.secret) as { id: string };
};
```