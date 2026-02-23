```javascript
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const config = require('../src/config');
const logger = require('../src/utils/logger');

const prisma = new PrismaClient();

const seedDatabase = async () => {
  try {
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: config.admin.email },
    });

    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping seed data for users.');
      // Update admin password if it has changed
      if (!await bcrypt.compare(config.admin.password, existingAdmin.password)) {
        const hashedPassword = await bcrypt.hash(config.admin.password, 12);
        await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { password: hashedPassword },
        });
        logger.info('Admin user password updated.');
      }
      return; // Exit if admin exists, assuming other data might be dependent
    }

    logger.info('Seeding database with initial users, projects, and tasks...');

    // 1. Create Users
    const hashedPasswordAdmin = await bcrypt.hash(config.admin.password, 12);
    const hashedPasswordManager = await bcrypt.hash('Manager@123', 12);
    const hashedPasswordMember = await bcrypt.hash('Member@123', 12);

    const admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: config.admin.email,
        password: hashedPasswordAdmin,
        role: 'ADMIN',
      },
    });

    const manager1 = await prisma.user.create({
      data: {
        name: 'Manager One',
        email: 'manager1@securetask.com',
        password: hashedPasswordManager,
        role: 'MANAGER',
      },
    });

    const manager2 = await prisma.user.create({
      data: {
        name: 'Manager Two',
        email: 'manager2@securetask.com',
        password: hashedPasswordManager,
        role: 'MANAGER',
      },
    });

    const member1 = await prisma.user.create({
      data: {
        name: 'Member One',
        email: 'member1@securetask.com',
        password: hashedPasswordMember,
        role: 'MEMBER',
      },
    });

    const member2 = await prisma.user.create({
      data: {
        name: 'Member Two',
        email: 'member2@securetask.com',
        password: hashedPasswordMember,
        role: 'MEMBER',
      },
    });

    logger.info('Users created.');

    // 2. Create Projects
    const project1 = await prisma.project.create({
      data: {
        name: 'SecureTask Backend Development',
        description: 'Developing the secure backend API for SecureTask application.',
        managerId: manager1.id,
        createdById: admin.id,
        status: 'IN_PROGRESS',
        members: {
          connect: [{ id: member1.id }, { id: member2.id }],
        },
      },
    });

    const project2 = await prisma.project.create({
      data: {
        name: 'SecureTask Frontend UI/UX',
        description: 'Building the user interface and experience for SecureTask.',
        managerId: manager2.id,
        createdById: admin.id,
        status: 'PENDING',
        members: {
          connect: [{ id: member1.id }],
        },
      },
    });

    logger.info('Projects created.');

    // 3. Create Tasks for Project 1
    const task1 = await prisma.task.create({
      data: {
        title: 'Implement User Auth with JWT',
        description: 'Set up JWT token generation and verification for user authentication.',
        projectId: project1.id,
        assignedToId: member1.id,
        createdById: manager1.id,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 days from now
      },
    });

    await prisma.task.create({
      data: {
        title: 'Develop Role-Based Access Control',
        description: 'Create middleware for role-based authorization for API endpoints.',
        projectId: project1.id,
        assignedToId: member2.id,
        createdById: manager1.id,
        status: 'PENDING',
        priority: 'HIGH',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 10)),
      },
    });

    const task3 = await prisma.task.create({
      data: {
        title: 'Database Schema Design',
        description: 'Define Prisma schema for User, Project, Task, and Comment models.',
        projectId: project1.id,
        assignedToId: member1.id,
        createdById: manager1.id,
        status: 'COMPLETED',
        priority: 'MEDIUM',
        dueDate: new Date(new Date().setDate(new Date().getDate() - 3)), // 3 days ago
      },
    });
    logger.info('Tasks for Project 1 created.');

    // 4. Create Comments for Task 1
    await prisma.comment.create({
      data: {
        content: 'Started working on this. Looking into `bcrypt` for password hashing.',
        taskId: task1.id,
        authorId: member1.id,
      },
    });

    await prisma.comment.create({
      data: {
        content: 'Make sure to consider refresh tokens for production readiness.',
        taskId: task1.id,
        authorId: manager1.id,
      },
    });
    logger.info('Comments created for Task 1.');


    // 5. Create Tasks for Project 2
    await prisma.task.create({
      data: {
        title: 'Design Login/Registration Forms',
        description: 'Create responsive and secure forms for user authentication.',
        projectId: project2.id,
        assignedToId: member1.id,
        createdById: manager2.id,
        status: 'PENDING',
        priority: 'MEDIUM',
        dueDate: new Date(new Date().setDate(new Date().getDate() + 14)),
      },
    });
    logger.info('Tasks for Project 2 created.');


    logger.info('Database seeding complete!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
};

// Only run seed if executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase; // Export for server.js to use
```