```typescript
import { Request } from 'express';
import { UserRole } from '../database/entities/User';

export interface DecodedToken {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: DecodedToken;
}
```