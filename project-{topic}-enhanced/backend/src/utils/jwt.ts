import jwt from 'jsonwebtoken';
import config from '../config';

export const generateToken = (userId: string, email: string, role: string): string => {
  const payload = { id: userId, email, role };
  return jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiresIn });
};
```

#### `backend/src/services/userService.ts`
```typescript