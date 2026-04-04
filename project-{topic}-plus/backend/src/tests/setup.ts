```typescript
import { PrismaClient } from '@prisma/client';
import { config } from '../config';
import { logger } from '../config/winston';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl, // Use the configured database URL
    },
  },
});

beforeAll(async () => {
  // Ensure the test database is clean before running tests
  logger.info('Setting up test database...');
  try {
    await prisma.$connect();
    // Drop all tables
    await prisma.$transaction([
      prisma.message.deleteMany(),
      prisma.conversationParticipant.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    logger.info('Test database cleaned.');
    // Run migrations explicitly for tests if needed, or rely on `docker-compose.yml` to run them
    // For local tests, you might need to run `npx prisma migrate dev --name test_init --skip-seed`
    // or ensure your test DB is already migrated.
  } catch (error) {
    logger.error('Failed to clean test database:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  logger.info('Tearing down test database...');
  await prisma.$disconnect();
  logger.info('Test database disconnected.');
});
```