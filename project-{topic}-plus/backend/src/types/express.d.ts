// This file extends the Express Request interface to include custom properties
// like 'user' after authentication middleware runs.
import { User as PrismaUser, Role } from '@prisma/client';

// Define a minimal User type for the request object, containing necessary info
// and omitting sensitive data like password.
interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser; // The authenticated user's payload
      requestId?: string; // Unique ID for each request for logging
      // Add other custom properties if needed
    }
  }
}
```