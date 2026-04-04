```typescript
import { PrismaClient, UserRole, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword123';
  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      username: 'adminuser',
      email: adminEmail,
      password: hashedPassword,
      role: UserRole.ADMIN,
    },
  });
  console.log(`Created/Updated admin user: ${admin.email}`);

  // Create a regular user
  const regularUserPassword = await bcrypt.hash('userpassword123', 10);
  const user1 = await prisma.user.upsert({
    where: { email: 'user1@example.com' },
    update: {},
    create: {
      username: 'testuser1',
      email: 'user1@example.com',
      password: regularUserPassword,
      role: UserRole.USER,
    },
  });
  console.log(`Created/Updated regular user: ${user1.email}`);

  // Create Categories for user1
  const categoryWork = await prisma.category.upsert({
    where: { name_userId: { name: 'Work', userId: user1.id } },
    update: {},
    create: {
      name: 'Work',
      userId: user1.id,
    },
  });
  console.log(`Created category: ${categoryWork.name} for user ${user1.username}`);

  const categoryPersonal = await prisma.category.upsert({
    where: { name_userId: { name: 'Personal', userId: user1.id } },
    update: {},
    create: {
      name: 'Personal',
      userId: user1.id,
    },
  });
  console.log(`Created category: ${categoryPersonal.name} for user ${user1.username}`);

  // Create Tasks for user1
  await prisma.task.upsert({
    where: { id: 'task-1-user1' }, // Use a unique ID for upsert or find a better unique field
    update: {},
    create: {
      id: 'task-1-user1',
      title: 'Finish API documentation',
      description: 'Complete the OpenAPI spec for all endpoints.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 3)), // 3 days from now
      userId: user1.id,
      categoryId: categoryWork.id,
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-2-user1' },
    update: {},
    create: {
      id: 'task-2-user1',
      title: 'Buy groceries',
      description: 'Milk, eggs, bread, vegetables.',
      status: TaskStatus.PENDING,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 1)), // Tomorrow
      userId: user1.id,
      categoryId: categoryPersonal.id,
    },
  });

  await prisma.task.upsert({
    where: { id: 'task-3-user1' },
    update: {},
    create: {
      id: 'task-3-user1',
      title: 'Refactor auth service',
      description: 'Improve error handling and testing in authentication service.',
      status: TaskStatus.COMPLETED,
      priority: TaskPriority.LOW,
      dueDate: new Date(new Date().setDate(new Date().getDate() - 5)), // 5 days ago
      userId: user1.id,
      categoryId: categoryWork.id,
    },
  });
  console.log(`Created tasks for user ${user1.username}`);

  // Create another regular user
  const regularUser2Password = await bcrypt.hash('userpassword456', 10);
  const user2 = await prisma.user.upsert({
    where: { email: 'user2@example.com' },
    update: {},
    create: {
      username: 'testuser2',
      email: 'user2@example.com',
      password: regularUser2Password,
      role: UserRole.USER,
    },
  });
  console.log(`Created/Updated regular user: ${user2.email}`);

  // Create a category and task for user2
  const categoryHobby = await prisma.category.upsert({
    where: { name_userId: { name: 'Hobby', userId: user2.id } },
    update: {},
    create: {
      name: 'Hobby',
      userId: user2.id,
    },
  });
  console.log(`Created category: ${categoryHobby.name} for user ${user2.username}`);

  await prisma.task.upsert({
    where: { id: 'task-1-user2' },
    update: {},
    create: {
      id: 'task-1-user2',
      title: 'Learn new language',
      description: 'Practice Spanish for 30 minutes daily.',
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
      userId: user2.id,
      categoryId: categoryHobby.id,
    },
  });
  console.log(`Created tasks for user ${user2.username}`);


  console.log('Database seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```