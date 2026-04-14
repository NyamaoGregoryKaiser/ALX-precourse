import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

// This setup file runs once before all tests.
// It ensures the database is clean and migrated for testing.

beforeAll(async () => {
  // Ensure the test database is clean.
  // This assumes your DATABASE_URL in .env.test is pointing to a test database.
  // For production readiness, use a separate test database URL in your CI/CD and local .env.test.
  console.log('--- Setting up test environment ---');
  try {
    // Drop and recreate test database to ensure a clean state
    // Note: This command is specific to PostgreSQL
    // If using Docker, ensure the DB service is running and accessible
    // You might need to adjust this command based on your DB setup and user permissions.
    // For a real production app, consider using a tool like `testcontainers` for ephemeral DBs.
    execSync(`npx prisma migrate reset --force --skip-seed`, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL } });
    execSync(`npx prisma migrate dev --name init --skip-generate --skip-seed`, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL } });
    execSync(`ts-node ${path.join(__dirname, '../../prisma/seed.ts')}`, { stdio: 'inherit', env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL } });

    console.log('Test database reset and seeded successfully.');
  } catch (error) {
    console.error('Error during test database setup:', error);
    process.exit(1); // Exit if DB setup fails
  }
});

afterAll(async () => {
  // Clean up after all tests are done
  await prisma.$disconnect();
  console.log('--- Test environment torn down ---');
});