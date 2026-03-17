```typescript
// This file extends Express's Request interface to add custom properties,
// such as the authenticated user.

import { User } from '../entities/User';

/**
 * @file Custom Express Request types.
 *
 * This declaration file extends the Express `Request` interface to
 * include custom properties, such as the `user` object, which is
 * populated by the authentication middleware.
 */

declare global {
  namespace Express {
    interface Request {
      user?: User; // Add the 'user' property to the Request object
    }
  }
}
```