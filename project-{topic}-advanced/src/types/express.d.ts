```typescript
import { UserRole } from '@prisma/client';

// Extend the Express Request interface to include user information after authentication
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: UserRole;
        // Add any other user properties you wish to attach to the request
      };
    }
  }
}
```