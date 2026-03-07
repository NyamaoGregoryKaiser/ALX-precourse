```typescript
import { Request } from 'express';
import { UserRole } from './entities/User';

// Extend the Request type to include user information after authentication
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string;
      username: string;
      email: string;
      roles: UserRole[];
    };
  }
}

// Custom type for request body validation errors
export interface ValidationError {
  property: string;
  constraints: { [type: string]: string };
}
```