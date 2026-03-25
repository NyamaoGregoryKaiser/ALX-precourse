import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../../users/enums/user-role.enum';
import { User } from '../../users/entities/user.entity';
import { Project } from '../../projects/entities/project.entity';
import { TaskStatus } from '../../tasks/enums/task-status.enum';
import { Task } from '../../tasks/entities/task.entity';
import { LoggerService } from '../../utils/logger';

/**
 * Script to seed initial data into the database.
 * This is useful for development environments or setting up a fresh database
 * with essential starting data.
 *
 * To run: `npm run seed:run`
 */
async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const logger = app.get(LoggerService);

  const userRepository = dataSource.getRepository(User);
  const projectRepository = dataSource.getRepository(Project);
  const taskRepository = dataSource.getRepository(Task);

  logger.log('Starting database seeding...');

  try {
    // Clear existing data (optional, for idempotent seeding)
    logger.log('Clearing existing data...');
    await taskRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});
    logger.log('Data cleared.');

    // 1. Create Users
    logger.log('Creating users...');
    const saltRounds = 10;

    const adminUser = userRepository.create({
      username: 'admin',
      email: 'admin@example.com',
      password: await bcrypt.hash('adminpassword', saltRounds),
      roles: [UserRole.ADMIN, UserRole.USER],
    });
    await userRepository.save(adminUser);

    const regularUser = userRepository.create({
      username: 'user',
      email: 'user@example.com',
      password: await bcrypt.hash('userpassword', saltRounds),
      roles: [UserRole.USER],
    });
    await userRepository.save(regularUser);
    logger.log('Users created successfully.');

    // 2. Create Projects
    logger.log('Creating projects...');
    const project1 = projectRepository.create({
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website.',
      owner: adminUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await projectRepository.save(project1);

    const project2 = projectRepository.create({
      name: 'Mobile App Development',
      description: 'Develop a new mobile application for iOS and Android.',
      owner: regularUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await projectRepository.save(project2);
    logger.log('Projects created successfully.');

    // 3. Create Tasks
    logger.log('Creating tasks...');
    const task1 = taskRepository.create({
      title: 'Design UI Mockups',
      description: 'Create high-fidelity UI mockups for the new website.',
      status: TaskStatus.IN_PROGRESS,
      priority: 1,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      project: project1,
      assignedTo: adminUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await taskRepository.save(task1);

    const task2 = taskRepository.create({
      title: 'Develop Backend API',
      description: 'Implement RESTful API endpoints for user and task management.',
      status: TaskStatus.TODO,
      priority: 2,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      project: project1,
      assignedTo: adminUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await taskRepository.save(task2);

    const task3 = taskRepository.create({
      title: 'Setup Database',
      description: 'Configure PostgreSQL database and TypeORM entities.',
      status: TaskStatus.DONE,
      priority: 0,
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      project: project1,
      assignedTo: adminUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await taskRepository.save(task3);

    const task4 = taskRepository.create({
      title: 'Plan App Features',
      description: 'Define core features and user stories for the mobile app.',
      status: TaskStatus.TODO,
      priority: 0,
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      project: project2,
      assignedTo: regularUser,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await taskRepository.save(task4);
    logger.log('Tasks created successfully.');

    logger.log('Database seeding completed!');
  } catch (error) {
    logger.error('Database seeding failed!', error.stack, error.message);
  } finally {
    await app.close();
  }
}

bootstrap();