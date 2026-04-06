```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

// Instantiate Prisma Client
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Optional: Log Prisma queries
prisma.$on('query', (e) => {
  logger.debug(`Prisma Query: ${e.query} Params: ${e.params} Duration: ${e.duration}ms`);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
});

prisma.$on('info', (e) => {
  logger.info(`Prisma Info: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warn: ${e.message}`);
});

export { prisma };
```