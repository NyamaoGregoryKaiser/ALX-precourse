```typescript
import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from './models/User.entity';
import { Project } from './models/Project.entity';
import { Task } from './models/Task.entity';
import { Comment } from './models/Comment.entity';
import { InitialSchema1701000000000 } from './migrations/1701000000000-InitialSchema';
import config from './config/config';
import logger from './utils/logger';
import * as bcrypt from 'bcryptjs';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: config.dbHost,
  port: config.dbPort,
  username: config.dbUser,
  password: config.dbPassword,
  database: config.dbName,
  // synchronize: config.nodeEnv === 'development', // NEVER use synchronize in production! Use migrations.
  synchronize: false, // Ensure synchronize is false for production-ready app, always use migrations
  logging: config.nodeEnv === 'development' ? ['query', 'error'] : ['error'], // Log queries only in development
  entities: [User, Project, Task, Comment],
  migrations: [InitialSchema1701000000000],
  subscribers: [],
});

export const seedDatabase = async () => {
  if (config.nodeEnv === 'production') {
    logger.warn('Database seeding is disabled in production environment.');
    return;
  }

  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database initialized for seeding.');
    } else {
      logger.info('Database already initialized, proceeding with seeding.');
    }

    logger.info('Starting database seeding...');

    const userRepository = AppDataSource.getRepository(User);
    const projectRepository = AppDataSource.getRepository(Project);
    const taskRepository = AppDataSource.getRepository(Task);
    const commentRepository = AppDataSource.getRepository(Comment);

    // Clear existing data (use with caution! For dev/test only.)
    logger.info('Clearing existing data...');
    await commentRepository.delete({});
    await taskRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});
    logger.info('Existing data cleared.');

    // Create Admin User
    const adminPassword = await bcrypt.hash('adminpassword', 10);
    const adminUser = userRepository.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: adminPassword,
      role: 'admin',
    });
    await userRepository.save(adminUser);
    logger.info(`Created admin user: ${adminUser.email}`);

    // Create Member User
    const memberPassword = await bcrypt.hash('memberpassword', 10);
    const memberUser = userRepository.create({
      username: 'memberuser',
      email: 'member@example.com',
      password: memberPassword,
      role: 'member',
    });
    await userRepository.save(memberUser);
    logger.info(`Created member user: ${memberUser.email}`);

    // Create Projects
    const project1 = projectRepository.create({
      name: 'Website Redesign',
      description: 'Redesign the company website with a modern look and improved UX.',
      owner: adminUser,
    });
    await projectRepository.save(project1);
    logger.info(`Created project: ${project1.name}`);

    const project2 = projectRepository.create({
      name: 'Mobile App Development',
      description: 'Develop a new mobile application for iOS and Android platforms.',
      owner: memberUser,
    });
    await projectRepository.save(project2);
    logger.info(`Created project: ${project2.name}`);

    // Create Tasks for Project 1
    const task1_1 = taskRepository.create({
      title: 'Design Mockups',
      description: 'Create initial design mockups for homepage and key landing pages.',
      project: project1,
      assignee: adminUser,
      status: 'in-progress',
      priority: 'high',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    });
    await taskRepository.save(task1_1);
    logger.info(`Created task: ${task1_1.title}`);

    const task1_2 = taskRepository.create({
      title: 'Develop Homepage',
      description: 'Implement the homepage based on approved mockups.',
      project: project1,
      assignee: memberUser,
      status: 'to-do',
      priority: 'medium',
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    });
    await taskRepository.save(task1_2);
    logger.info(`Created task: ${task1_2.title}`);

    // Create Comments
    const comment1 = commentRepository.create({
      content: 'Started working on the wireframes. Will share updates by end of day.',
      author: adminUser,
      task: task1_1,
    });
    await commentRepository.save(comment1);
    logger.info('Created comment 1');

    const comment2 = commentRepository.create({
      content: 'Please ensure responsiveness for mobile devices.',
      author: memberUser,
      task: task1_1,
    });
    await commentRepository.save(comment2);
    logger.info('Created comment 2');

    logger.info('Database seeding completed successfully.');
  } catch (error: any) {
    logger.error('Database seeding failed:', error.message, error.stack);
    throw error; // Re-throw to indicate failure
  }
};

// Export seedDatabase if you want to call it directly, e.g., from a script
// If calling from app.ts, it's already imported there.
// (global as any).seedDatabase = seedDatabase; // For CLI calls like `ts-node src/data-source.ts seedDatabase`
```