```typescript
import 'reflect-metadata';
import { AppDataSource } from '../ormconfig';
import { User, UserRole } from '../models/User';
import { Project, ProjectStatus } from '../models/Project';
import { Task, TaskPriority, TaskStatus } from '../models/Task';
import { hashPassword } from '../utils/password';
import logger from '../config/logger';

const seedDatabase = async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    logger.info('Database initialized for seeding.');
  }

  try {
    const userRepository = AppDataSource.getRepository(User);
    const projectRepository = AppDataSource.getRepository(Project);
    const taskRepository = AppDataSource.getRepository(Task);

    logger.info('Starting database seeding...');

    // Clear existing data (optional, for development only)
    await taskRepository.delete({});
    await projectRepository.delete({});
    await userRepository.delete({});
    logger.info('Cleared existing data.');

    // Create users
    const adminPassword = await hashPassword('AdminPass123!');
    const managerPassword = await hashPassword('ManagerPass123!');
    const userPassword = await hashPassword('UserPass123!');

    const admin = userRepository.create({
      username: 'adminuser',
      email: 'admin@example.com',
      password: adminPassword,
      role: UserRole.ADMIN,
    });
    await userRepository.save(admin);

    const manager = userRepository.create({
      username: 'manageruser',
      email: 'manager@example.com',
      password: managerPassword,
      role: UserRole.MANAGER,
    });
    await userRepository.save(manager);

    const regularUser1 = userRepository.create({
      username: 'john_doe',
      email: 'john@example.com',
      password: userPassword,
      role: UserRole.USER,
    });
    await userRepository.save(regularUser1);

    const regularUser2 = userRepository.create({
      username: 'jane_smith',
      email: 'jane@example.com',
      password: userPassword,
      role: UserRole.USER,
    });
    await userRepository.save(regularUser2);
    logger.info('Users created.');

    // Create projects
    const project1 = projectRepository.create({
      name: 'Website Redesign',
      description: 'Complete overhaul of the company website for better UX and performance.',
      startDate: new Date('2023-01-15'),
      endDate: new Date('2023-06-30'),
      status: ProjectStatus.IN_PROGRESS,
      owner: admin,
    });
    await projectRepository.save(project1);

    const project2 = projectRepository.create({
      name: 'Mobile App Development',
      description: 'Build a new mobile application for iOS and Android platforms.',
      startDate: new Date('2023-03-01'),
      endDate: new Date('2023-12-31'),
      status: ProjectStatus.PLANNED,
      owner: manager,
    });
    await projectRepository.save(project2);

    const project3 = projectRepository.create({
      name: 'Internal Tool Automation',
      description: 'Automate several internal processes to reduce manual effort.',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-03-31'),
      status: ProjectStatus.COMPLETED,
      owner: regularUser1,
    });
    await projectRepository.save(project3);
    logger.info('Projects created.');

    // Create tasks
    const task1 = taskRepository.create({
      title: 'Design UI/UX Mockups',
      description: 'Create high-fidelity mockups for key website pages.',
      project: project1,
      assignedTo: regularUser1,
      dueDate: new Date('2023-02-15'),
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
    });
    await taskRepository.save(task1);

    const task2 = taskRepository.create({
      title: 'Develop Backend API',
      description: 'Implement RESTful APIs for user management and project data.',
      project: project1,
      assignedTo: regularUser2,
      dueDate: new Date('2023-04-30'),
      status: TaskStatus.IN_PROGRESS,
      priority: TaskPriority.HIGH,
    });
    await taskRepository.save(task2);

    const task3 = taskRepository.create({
      title: 'Setup Database Schema',
      description: 'Define and implement initial database schema for the mobile app.',
      project: project2,
      assignedTo: manager,
      dueDate: new Date('2023-03-15'),
      status: TaskStatus.TODO,
      priority: TaskPriority.MEDIUM,
    });
    await taskRepository.save(task3);

    const task4 = taskRepository.create({
      title: 'Implement Payment Gateway',
      description: 'Integrate a secure payment gateway for new mobile app features.',
      project: project2,
      assignedTo: null, // Unassigned task
      dueDate: new Date('2023-09-30'),
      status: TaskStatus.BLOCKED,
      priority: TaskPriority.HIGH,
    });
    await taskRepository.save(task4);
    logger.info('Tasks created.');

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error(`Database seeding failed: ${error instanceof Error ? error.message : error}`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed after seeding.');
    }
  }
};

seedDatabase();
```