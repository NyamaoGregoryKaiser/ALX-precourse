import { PrismaClient, UserRole, ProjectStatus, TaskStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // Create Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      password: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
    },
  });
  console.log(`Created admin user with ID: ${adminUser.id}`);

  // Create Member User 1
  const member1Password = await bcrypt.hash('member123', 10);
  const memberUser1 = await prisma.user.upsert({
    where: { email: 'member1@example.com' },
    update: {},
    create: {
      email: 'member1@example.com',
      password: member1Password,
      firstName: 'Alice',
      lastName: 'Smith',
      role: UserRole.MEMBER,
    },
  });
  console.log(`Created member user 1 with ID: ${memberUser1.id}`);

  // Create Member User 2
  const member2Password = await bcrypt.hash('member123', 10);
  const memberUser2 = await prisma.user.upsert({
    where: { email: 'member2@example.com' },
    update: {},
    create: {
      email: 'member2@example.com',
      password: member2Password,
      firstName: 'Bob',
      lastName: 'Johnson',
      role: UserRole.MEMBER,
    },
  });
  console.log(`Created member user 2 with ID: ${memberUser2.id}`);

  // Create Projects
  const project1 = await prisma.project.upsert({
    where: { id: '0a1b2c3d-e4f5-6789-abcd-ef0123456789' }, // Arbitrary ID for upsert
    update: {},
    create: {
      name: 'Website Redesign',
      description: 'Redesign the company website for better UX and modern aesthetics.',
      ownerId: adminUser.id,
      status: ProjectStatus.IN_PROGRESS,
    },
  });
  console.log(`Created project: ${project1.name}`);

  const project2 = await prisma.project.upsert({
    where: { id: '1b2c3d4e-f5a6-7890-bcde-f01234567890' },
    update: {},
    create: {
      name: 'Mobile App Development',
      description: 'Develop a new mobile application for iOS and Android platforms.',
      ownerId: memberUser1.id,
      status: ProjectStatus.OPEN,
    },
  });
  console.log(`Created project: ${project2.name}`);

  const project3 = await prisma.project.upsert({
    where: { id: '2c3d4e5f-6a7b-8901-cdef-012345678901' },
    update: {},
    create: {
      name: 'Backend API Refactoring',
      description: 'Improve performance and maintainability of existing backend APIs.',
      ownerId: adminUser.id,
      status: ProjectStatus.COMPLETED,
    },
  });
  console.log(`Created project: ${project3.name}`);

  // Create Tasks for Project 1 (Website Redesign)
  await prisma.task.upsert({
    where: { id: 't1a2b3c4-d5e6-7f89-0123-456789abcdef' },
    update: {},
    create: {
      title: 'Design homepage mockups',
      description: 'Create initial design mockups for the new homepage layout.',
      projectId: project1.id,
      reporterId: adminUser.id,
      assigneeId: memberUser1.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
    },
  });

  await prisma.task.upsert({
    where: { id: 't2b3c4d5-e6f7-8a90-1234-56789abcdef0' },
    update: {},
    create: {
      title: 'Develop frontend navigation',
      description: 'Implement the new navigation bar and menus using React.',
      projectId: project1.id,
      reporterId: memberUser1.id,
      assigneeId: memberUser2.id,
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 14)), // 14 days from now
    },
  });

  await prisma.task.upsert({
    where: { id: 't3c4d5e6-f7a8-9b01-2345-6789abcdef01' },
    update: {},
    create: {
      title: 'Review existing content',
      description: 'Audit and update all existing website content for accuracy and relevance.',
      projectId: project1.id,
      reporterId: adminUser.id,
      assigneeId: memberUser1.id,
      status: TaskStatus.DONE,
      priority: TaskPriority.LOW,
      dueDate: new Date(new Date().setDate(new Date().getDate() - 5)), // 5 days ago
    },
  });
  console.log(`Created tasks for project: ${project1.name}`);


  // Create Tasks for Project 2 (Mobile App Development)
  await prisma.task.upsert({
    where: { id: 't4d5e6f7-a8b9-0c12-3456-789abcdef012' },
    update: {},
    create: {
      title: 'Setup mobile project environment',
      description: 'Configure React Native or Flutter project, install dependencies.',
      projectId: project2.id,
      reporterId: memberUser1.id,
      assigneeId: memberUser2.id,
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 3)),
    },
  });
  console.log(`Created tasks for project: ${project2.name}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });