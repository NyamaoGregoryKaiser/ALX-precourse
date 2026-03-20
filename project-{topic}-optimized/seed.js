const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { USER_ROLES, TASK_STATUS, ProjectStatus } = require('./src/config/constants'); // Corrected import
require('dotenv').config();

const prisma = new PrismaClient();

const main = async () => {
  console.log('Starting database seeding...');

  // 1. Create Users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      username: 'adminuser',
      email: 'admin@example.com',
      password: hashedPassword,
      role: USER_ROLES.ADMIN
    }
  });

  const managerUser = await prisma.user.upsert({
    where: { email: 'manager@example.com' },
    update: {},
    create: {
      username: 'manageruser',
      email: 'manager@example.com',
      password: hashedPassword,
      role: USER_ROLES.MANAGER
    }
  });

  const memberUser = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      username: 'memberuser',
      email: 'member@example.com',
      password: hashedPassword,
      role: USER_ROLES.MEMBER
    }
  });

  console.log('Users created:', { adminUser: adminUser.email, managerUser: managerUser.email, memberUser: memberUser.email });

  // 2. Create Projects
  const project1 = await prisma.project.upsert({
    where: { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' }, // Consistent ID for testing
    update: {},
    create: {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Mobile App Revamp',
      description: 'Revamping the core mobile application UI/UX and backend for better performance.',
      ownerId: managerUser.id,
      status: ProjectStatus.ACTIVE
    }
  });

  const project2 = await prisma.project.upsert({
    where: { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12' },
    update: {},
    create: {
      id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      name: 'API V2 Development',
      description: 'Developing a new version of the public API with GraphQL support.',
      ownerId: adminUser.id,
      status: ProjectStatus.IN_PROGRESS // Corrected from ProjectStatus.ACTIVE to a valid enum
    }
  });

  const project3 = await prisma.project.upsert({
    where: { id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13' },
    update: {},
    create: {
      id: 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
      name: 'Marketing Campaign Launch',
      description: 'Plan and execute the Q3 marketing campaign for new product features.',
      ownerId: memberUser.id,
      status: ProjectStatus.ACTIVE
    }
  });

  console.log('Projects created:', { project1: project1.name, project2: project2.name, project3: project3.name });

  // 3. Create Tasks
  const task1 = await prisma.task.upsert({
    where: { id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14' },
    update: {},
    create: {
      id: 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14',
      title: 'Design new user dashboard',
      description: 'Create wireframes and mockups for the revamped user dashboard.',
      projectId: project1.id,
      assignedToId: memberUser.id,
      creatorId: managerUser.id,
      status: TASK_STATUS.IN_PROGRESS,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
      tags: ['design', 'frontend', 'UI/UX']
    }
  });

  const task2 = await prisma.task.upsert({
    where: { id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15' },
    update: {},
    create: {
      id: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15',
      title: 'Implement authentication API',
      description: 'Develop and test JWT-based authentication endpoints.',
      projectId: project1.id,
      assignedToId: adminUser.id,
      creatorId: managerUser.id,
      status: TASK_STATUS.PENDING,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 14)), // 14 days from now
      tags: ['backend', 'security', 'API']
    }
  });

  const task3 = await prisma.task.upsert({
    where: { id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16' },
    update: {},
    create: {
      id: 'f0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16',
      title: 'Database schema review',
      description: 'Review and optimize existing database schemas for API V2.',
      projectId: project2.id,
      assignedToId: adminUser.id,
      creatorId: adminUser.id,
      status: TASK_STATUS.COMPLETED,
      dueDate: new Date(new Date().setDate(new Date().getDate() - 3)), // 3 days ago
      tags: ['database', 'API V2']
    }
  });

  const task4 = await prisma.task.upsert({
    where: { id: 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17' },
    update: {},
    create: {
      id: 'g0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17',
      title: 'Create social media assets',
      description: 'Prepare images and videos for the upcoming marketing campaign.',
      projectId: project3.id,
      assignedToId: memberUser.id,
      creatorId: memberUser.id,
      status: TASK_STATUS.PENDING,
      dueDate: new Date(new Date().setDate(new Date().getDate() + 10)), // 10 days from now
      tags: ['marketing', 'design']
    }
  });

  console.log('Tasks created:', { task1: task1.title, task2: task2.title, task3: task3.title, task4: task4.title });

  console.log('Database seeding complete!');
};

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

### 3. Configuration & Setup

#### `.env.example`

```ini