```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// This is a singleton pattern for PrismaClient
// It ensures only one instance of PrismaClient is created and reused throughout the application.

let prisma: PrismaClient;

if (env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // In development, store PrismaClient on the global object to prevent
  // multiple instances when hot-reloading (which can cause too many database connections)
  if (!(global as any).prisma) {
    (global as any).prisma = new PrismaClient({
      log: ['query', 'info', 'warn', 'error'], // Log database queries in development
    });
    logger.info('Initialized Prisma Client for development environment');
  }
  prisma = (global as any).prisma;
}

export { prisma };
```

**Seed Data**