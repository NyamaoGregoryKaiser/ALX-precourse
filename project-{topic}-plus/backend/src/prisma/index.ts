```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/winston';

const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'info', emit: 'event' },
    { level: 'warn', emit: 'event' },
    { level: 'error', emit: 'event' },
  ],
});

// Log Prisma queries and events for debugging/monitoring
prisma.$on('query', (e) => {
  logger.debug(`Prisma Query: ${e.query} Params: ${e.params} Duration: ${e.duration}ms`);
});

prisma.$on('info', (e) => {
  logger.info(`Prisma Info: ${e.message}`);
});

prisma.$on('warn', (e) => {
  logger.warn(`Prisma Warn: ${e.message}`);
});

prisma.$on('error', (e) => {
  logger.error(`Prisma Error: ${e.message}`);
});

export default prisma;
```