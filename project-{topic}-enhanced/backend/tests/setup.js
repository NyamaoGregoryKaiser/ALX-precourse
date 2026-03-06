```javascript
import { PrismaClient } from '@prisma/client';
import { exec as nodeExec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const exec = promisify(nodeExec);

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();
const schemaPath = path.join(__dirname, '../prisma/schema.prisma'); // Path to your prisma schema file
const migrationsDir = path.join(__dirname, '../prisma/migrations'); // Path to your prisma migrations directory

// Use a separate test database
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://testuser:testpass@localhost:5433/test_db?schema=public';
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6380';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'testsecret';
process.env.JWT_ACCESS_EXPIRATION_MINUTES = process.env.JWT_ACCESS_EXPIRATION_MINUTES || '1';
process.env.JWT_REFRESH_EXPIRATION_DAYS = process.env.JWT_REFRESH_EXPIRATION_DAYS || '1';

beforeAll(async () => {
  console.log('Setting up test environment...');
  try {
    // 1. Drop existing test database and recreate (or ensure it's clean)
    // This command needs postgres user with appropriate permissions.
    // In CI, make sure the test user can drop the DB.
    // For a robust setup, consider `prisma db push --force` or specific test database management.
    // For now, `migrate deploy` handles initial creation/update.
    await exec(`npx prisma migrate reset --force --skip-generate --skip-seed`, { env: process.env });
    await exec(`npx prisma migrate deploy`, { env: process.env });
    await exec(`npx prisma generate`, { env: process.env });

    // Ensure Redis is flushed
    await prisma.$disconnect(); // Ensure no active connection for exec
    const redis = (await import('../src/utils/cache.js')).default.getClient();
    await redis.connect();
    await redis.flushdb();
    await redis.disconnect();
    console.log('Test database reset and migrations applied.');
  } catch (error) {
    console.error('Failed to set up test database:', error);
    process.exit(1);
  }
});

afterAll(async () => {
  console.log('Tearing down test environment...');
  try {
    // Disconnect Prisma client
    await prisma.$disconnect();

    // Optionally drop the test database after all tests (can be slow)
    // await exec(`npx prisma migrate reset --force --skip-generate --skip-seed`, { env: process.env });

    // Flush Redis again
    const redis = (await import('../src/utils/cache.js')).default.getClient();
    await redis.connect();
    await redis.flushdb();
    await redis.disconnect();

    console.log('Test environment torn down.');
  } catch (error) {
    console.error('Failed to tear down test database:', error);
    process.exit(1);
  }
});

// Clean up database before each test to ensure isolation
beforeEach(async () => {
  // Clear all data from tables while respecting foreign key constraints
  const tables = [
    'Message',
    'ChannelUser',
    'Channel',
    'User'
  ];

  for (const table of tables) {
    try {
      await prisma[table.toLowerCase()].deleteMany({});
    } catch (e) {
      console.warn(`Could not clear table ${table}: ${e.message}`);
    }
  }

  // Clear Redis cache before each test
  const redis = (await import('../src/utils/cache.js')).default.getClient();
  await redis.flushdb();

  console.log('Database and Redis cleared for next test.');
});
```