import { PrismaClient, Role } from '@prisma/client';
import { hashPassword } from '../src/utils/password'; // Adjust path as necessary
import { config } from 'dotenv';
import path from 'path';

// Load environment variables for seeding
config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create an Admin user
  const adminPassword = process.env.NODE_ENV === 'test' ? 'testpassword' : 'password123'; // Use simple password for tests
  const hashedPassword = await hashPassword(adminPassword);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      role: Role.ADMIN,
    },
  });
  console.log(`Created/updated admin user: ${adminUser.email}`);

  // Create a Project Manager user
  const pmPassword = process.env.NODE_ENV === 'test' ? 'testpassword' : 'password123';
  const hashedPmPassword = await hashPassword(pmPassword);
  const projectManagerUser = await prisma.user.upsert({
    where: { email: 'pm@example.com' },
    update: {},
    create: {
      email: 'pm@example.com',
      firstName: 'Project',
      lastName: 'Manager',
      password: hashedPmPassword,
      role: Role.PROJECT_MANAGER,
    },
  });
  console.log(`Created/updated project manager user: ${projectManagerUser.email}`);

  // Create a Member user
  const memberPassword = process.env.NODE_ENV === 'test' ? 'testpassword' : 'password123';
  const hashedMemberPassword = await hashPassword(memberPassword);
  const memberUser = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      firstName: 'Team',
      lastName: 'Member',
      password: hashedMemberPassword,
      role: Role.MEMBER,
    },
  });
  console.log(`Created/updated member user: ${memberUser.email}`);

  // Create a project managed by the Project Manager
  const project = await prisma.project.upsert({
    where: { name: 'Initial Project' },
    update: {},
    create: {
      name: 'Initial Project',
      description: 'A sample project to get started.',
      managerId: projectManagerUser.id,
      status: 'In Progress',
    },
  });
  console.log(`Created/updated project: ${project.name}`);

  // Create tasks for the project
  await prisma.task.upsert({
    where: { title: 'Setup database' },
    update: {},
    create: {
      title: 'Setup database',
      description: 'Configure PostgreSQL and run migrations.',
      projectId: project.id,
      assignedToId: memberUser.id,
      status: 'In Progress',
      priority: 'High',
    },
  });

  await prisma.task.upsert({
    where: { title: 'Implement authentication' },
    update: {},
    create: {
      title: 'Implement authentication',
      description: 'Set up JWT, login, and registration endpoints.',
      projectId: project.id,
      assignedToId: projectManagerUser.id,
      status: 'To Do',
      priority: 'High',
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });