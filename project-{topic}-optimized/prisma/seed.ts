import { PrismaClient, Role, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seeding...');

  // HASH PASSWORDS
  const hashedPassword1 = await bcrypt.hash('password123', 10);
  const hashedPassword2 = await bcrypt.hash('securepassword', 10);
  const hashedPassword3 = await bcrypt.hash('adminpass', 10);

  // 1. Create Users
  const user1 = await prisma.user.upsert({
    where: { email: 'john.doe@example.com' },
    update: {},
    create: {
      username: 'johndoe',
      email: 'john.doe@example.com',
      password: hashedPassword1,
      firstName: 'John',
      lastName: 'Doe',
      role: Role.USER,
    },
  });

  const user2 = await prisma.user.upsert({
    where: { email: 'jane.smith@example.com' },
    update: {},
    create: {
      username: 'janesmith',
      email: 'jane.smith@example.com',
      password: hashedPassword2,
      firstName: 'Jane',
      lastName: 'Smith',
      role: Role.MANAGER,
    },
  });

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'adminuser',
      email: 'admin@example.com',
      password: hashedPassword3,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.ADMIN,
    },
  });

  console.log('Users created:', { user1, user2, adminUser });

  // 2. Create Teams
  const teamAlpha = await prisma.team.upsert({
    where: { name: 'Alpha Team' },
    update: {},
    create: {
      name: 'Alpha Team',
      description: 'Team focused on frontend development.',
    },
  });

  const teamBeta = await prisma.team.upsert({
    where: { name: 'Beta Team' },
    update: {},
    create: {
      name: 'Beta Team',
      description: 'Team focused on backend services and APIs.',
    },
  });

  console.log('Teams created:', { teamAlpha, teamBeta });

  // 3. Add Users to Teams (Team Members)
  const teamMember1 = await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: user1.id, teamId: teamAlpha.id } },
    update: {},
    create: {
      userId: user1.id,
      teamId: teamAlpha.id,
      role: Role.USER,
    },
  });

  const teamMember2 = await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: user2.id, teamId: teamAlpha.id } },
    update: {},
    create: {
      userId: user2.id,
      teamId: teamAlpha.id,
      role: Role.MANAGER, // Jane is a manager in Alpha Team
    },
  });

  const teamMember3 = await prisma.teamMember.upsert({
    where: { userId_teamId: { userId: user2.id, teamId: teamBeta.id } },
    update: {},
    create: {
      userId: user2.id,
      teamId: teamBeta.id,
      role: Role.USER,
    },
  });

  console.log('Team Members created:', { teamMember1, teamMember2, teamMember3 });

  // 4. Create Projects
  const project1 = await prisma.project.upsert({
    where: { name: 'Mobile App Redesign' },
    update: {},
    create: {
      name: 'Mobile App Redesign',
      description: 'Redesigning the entire mobile application UI/UX.',
      ownerId: user2.id, // Jane Smith owns this project
      teamId: teamAlpha.id, // Belongs to Alpha Team
      startDate: new Date('2023-10-01'),
      endDate: new Date('2023-12-31'),
      status: 'active',
    },
  });

  const project2 = await prisma.project.upsert({
    where: { name: 'Backend API Optimization' },
    update: {},
    create: {
      name: 'Backend API Optimization',
      description: 'Improving performance and scalability of existing APIs.',
      ownerId: user2.id, // Jane Smith also owns this project
      teamId: teamBeta.id, // Belongs to Beta Team
      startDate: new Date('2023-09-15'),
      endDate: new Date('2024-01-31'),
      status: 'active',
    },
  });

  console.log('Projects created:', { project1, project2 });

  // 5. Create Tasks
  const task1 = await prisma.task.upsert({
    where: { title: 'Design user profile screen' },
    update: {},
    create: {
      title: 'Design user profile screen',
      description: 'Create mockups and high-fidelity designs for the user profile.',
      projectId: project1.id,
      assigneeId: user1.id, // John Doe is assigned
      status: TaskStatus.IN_PROGRESS,
      priority: 4,
      dueDate: new Date('2023-11-15'),
    },
  });

  const task2 = await prisma.task.upsert({
    where: { title: 'Implement JWT authentication' },
    update: {},
    create: {
      title: 'Implement JWT authentication',
      description: 'Develop and integrate JWT-based authentication for the backend.',
      projectId: project2.id,
      assigneeId: user2.id, // Jane Smith is assigned
      status: TaskStatus.TODO,
      priority: 5,
      dueDate: new Date('2023-11-30'),
    },
  });

  const task3 = await prisma.task.upsert({
    where: { title: 'Database schema review' },
    update: {},
    create: {
      title: 'Database schema review',
      description: 'Review and optimize the database schema for scalability.',
      projectId: project2.id,
      assigneeId: adminUser.id, // Admin user is assigned
      status: TaskStatus.DONE,
      priority: 3,
      dueDate: new Date('2023-10-20'),
    },
  });

  console.log('Tasks created:', { task1, task2, task3 });

  // 6. Create Comments
  const comment1 = await prisma.comment.upsert({
    where: { content: 'Looking good so far, keep it up!' }, // Unique field for upsert
    update: {},
    create: {
      content: 'Looking good so far, keep it up!',
      taskId: task1.id,
      authorId: user2.id,
    },
  });

  const comment2 = await prisma.comment.upsert({
    where: { content: 'Consider using Passport.js for strategy.' },
    update: {},
    create: {
      content: 'Consider using Passport.js for strategy.',
      taskId: task2.id,
      authorId: adminUser.id,
    },
  });

  console.log('Comments created:', { comment1, comment2 });

  // 7. Create Attachment
  const attachment1 = await prisma.attachment.upsert({
    where: { fileUrl: 'https://example.com/mockup_v1.png' },
    update: {},
    create: {
      filename: 'mockup_v1.png',
      fileUrl: 'https://example.com/mockup_v1.png',
      fileType: 'image/png',
      fileSize: 120480,
      taskId: task1.id,
    },
  });

  console.log('Attachment created:', { attachment1 });

  console.log('Seeding finished successfully.');
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

```javascript