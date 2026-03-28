// This file runs once before all tests
import 'dotenv/config'; // Load environment variables for tests

// Set NODE_ENV to test to prevent accidental database operations on dev/prod DB
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || "postgresql://testuser:testpassword@localhost:5433/ecommerce_test_db?schema=public";
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || 'testsecretkey';
process.env.ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'testadmin@example.com';
process.env.ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'testpassword123';
process.env.LOG_LEVEL = 'error'; // Suppress logs during tests

// Mock Prisma Client to clear database between integration tests or ensure isolation
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// This runs before all tests are executed.
beforeAll(async () => {
  // Ensure the test database is clean before running tests.
  // This is a destructive operation, be careful with DATABASE_URL.
  console.log('Setting up test environment...');
  try {
    // Apply migrations to the test database
    // This is typically done via a shell command in CI/CD, but for local testing:
    // await exec('npx prisma migrate deploy', { cwd: './backend' }); // Or use programmatic migration
    console.log('Test database setup complete.');
  } catch (error) {
    console.error('Failed to setup test database:', error);
    process.exit(1);
  }
});

// This runs after all tests are executed.
afterAll(async () => {
  console.log('Tearing down test environment...');
  // Disconnect Prisma
  await prisma.$disconnect();
});

// For integration tests, we often want to clear the database between each test suite or test.
// This is a common pattern for Jest's `afterEach` in integration test files.
// Example:
// import { PrismaClient } from '@prisma/client';
// const prisma = new PrismaClient();
// afterEach(async () => {
//   await prisma.orderItem.deleteMany();
//   await prisma.order.deleteMany();
//   await prisma.product.deleteMany();
//   await prisma.category.deleteMany();
//   await prisma.user.deleteMany({ where: { email: { not: 'testadmin@example.com' } } }); // Keep admin if needed
// });
// Or simply:
// afterEach(async () => {
//   const transactions = [
//     prisma.orderItem.deleteMany(),
//     prisma.order.deleteMany(),
//     prisma.product.deleteMany(),
//     prisma.category.deleteMany(),
//     prisma.user.deleteMany(),
//   ];
//   await prisma.$transaction(transactions);
// });
// Note: For actual integration tests, you'd typically manage test data setup/teardown more carefully.