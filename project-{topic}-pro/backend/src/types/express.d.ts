```typescript
// This file extends the Express Request object to include `userId`
// This is necessary for TypeScript to recognize `req.userId` without errors
import { Request } from 'express';

declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}
```