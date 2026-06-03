```typescript
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/password-hasher';
import { logger } from '../src/utils/logger'; // Using the application's logger

const prisma = new PrismaClient();

async function main() {
  logger.info('Starting database seeding...');

  // Clear existing data (optional, useful for development)
  await prisma.task.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();
  logger.info('Cleared existing data.');

  // Create an admin user
  const adminPassword = await hashPassword('Admin123!');
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
    },
  });
  logger.info(`Created admin user: ${adminUser.email}`);

  // Create a regular user
  const userPassword = await hashPassword('User123!');
  const regularUser = await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'user@example.com',
      password: userPassword,
      role: 'user',
    },
  });
  logger.info(`Created regular user: ${regularUser.email}`);

  // Create categories for the regular user
  const workCategory = await prisma.category.create({
    data: {
      name: 'Work',
      userId: regularUser.id,
    },
  });
  const personalCategory = await prisma.category.create({
    data: {
      name: 'Personal',
      userId: regularUser.id,
    },
  });
  const shoppingCategory = await prisma.category.create({
    data: {
      name: 'Shopping',
      userId: regularUser.id,
    },
  });
  logger.info(`Created categories for ${regularUser.email}: ${workCategory.name}, ${personalCategory.name}, ${shoppingCategory.name}`);

  // Create tasks for the regular user
  await prisma.task.createMany({
    data: [
      {
        userId: regularUser.id,
        categoryId: workCategory.id,
        title: 'Complete project proposal',
        description: 'Draft the project proposal for the new client.',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
        status: 'IN_PROGRESS',
      },
      {
        userId: regularUser.id,
        categoryId: workCategory.id,
        title: 'Review team code',
        description: 'Review pull requests from John and Jane.',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 2)), // 2 days from now
        status: 'PENDING',
      },
      {
        userId: regularUser.id,
        categoryId: personalCategory.id,
        title: 'Go for a run',
        description: 'Morning run in the park for 30 minutes.',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
        status: 'PENDING',
      },
      {
        userId: regularUser.id,
        categoryId: shoppingCategory.id,
        title: 'Buy groceries',
        description: 'Milk, eggs, bread, vegetables.',
        dueDate: new Date(), // Today
        status: 'PENDING',
      },
      {
        userId: regularUser.id,
        categoryId: personalCategory.id,
        title: 'Read a book',
        description: 'Finish "The Alchemist".',
        status: 'COMPLETED',
        dueDate: new Date(new Date().setDate(new Date().getDate() - 3)), // 3 days ago
      },
    ],
  });
  logger.info(`Created tasks for ${regularUser.email}.`);

  // Create categories and tasks for the admin user (less detailed for example)
  const adminCategory = await prisma.category.create({
    data: {
      name: 'Admin Tasks',
      userId: adminUser.id,
    },
  });
  await prisma.task.create({
    data: {
      userId: adminUser.id,
      categoryId: adminCategory.id,
      title: 'Setup monitoring alerts',
      description: 'Configure new alerts for server performance.',
      status: 'IN_PROGRESS',
    },
  });
  logger.info(`Created categories and tasks for ${adminUser.email}.`);

  logger.info('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    logger.error('Database seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Migrations:**

Prisma handles migrations. To generate an initial migration:
`npx prisma migrate dev --name init`

This will create a `prisma/migrations` folder with a timestamped migration file. The content will look something like this (simplified):