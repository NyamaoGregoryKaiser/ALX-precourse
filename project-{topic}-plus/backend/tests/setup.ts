// This file is executed once before all tests.
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import { env } from '../src/config/env';
import { logger } from '../src/utils/logger';

// Use a separate Prisma Client for tests pointing to TEST_DATABASE_URL
const prismaTest = new PrismaClient({
  datasources: {
    db: {
      url: env.TEST_DATABASE_URL,
    },
  },
});

beforeAll(async () => {
  // Apply migrations to the test database
  logger.info('Running migrations on test database...');
  try {
    // Ensure the test database exists and apply migrations
    // For `prisma migrate dev` to work in tests, typically need to reset the DB
    execSync(`DATABASE_URL=${env.TEST_DATABASE_URL} npx prisma migrate deploy`);
    execSync(`DATABASE_URL=${env.TEST_DATABASE_URL} npx prisma db seed`); // Seed the test database
    logger.info('Test database migrations and seeding complete.');
  } catch (error) {
    logger.error('Failed to migrate/seed test database:', (error as Error).message);
    throw error;
  }
});

afterAll(async () => {
  // Clean up the test database after all tests are done
  logger.info('Cleaning up test database...');
  try {
    // Delete all data from tables, but keep the schema for faster subsequent test runs
    const tablenames = await prismaTest.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

    const tables = tablenames
      .map(({ tablename }) => tablename)
      .filter((name) => name !== '_prisma_migrations') // Don't delete Prisma migration table
      .map((name) => `"public"."${name}"`)
      .join(', ');

    if (tables) {
      await prismaTest.$executeRawUnsafe(`TRUNCATE ${tables} RESTART IDENTITY CASCADE;`);
      logger.info('Test database truncated.');
    }

    await prismaTest.$disconnect();
  } catch (error) {
    logger.error('Failed to clean up test database:', (error as Error).message);
    throw error;
  }
});
```