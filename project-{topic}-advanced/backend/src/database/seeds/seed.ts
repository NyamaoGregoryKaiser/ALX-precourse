```typescript
import 'reflect-metadata';
import { AppDataSource } from '../data-source';
import { User } from '../../entities/User.entity';
import { Project } from '../../entities/Project.entity';
import { Monitor } from '../../entities/Monitor.entity';
import { Alert } from '../../entities/Alert.entity';
import { hashPassword } from '../../utils/password.utils';
import logger from '../../utils/logger';

async function seed() {
  await AppDataSource.initialize();
  logger.info('Database connection established for seeding.');

  try {
    const userRepository = AppDataSource.getRepository(User);
    const projectRepository = AppDataSource.getRepository(Project);
    const monitorRepository = AppDataSource.getRepository(Monitor);
    const alertRepository = AppDataSource.getRepository(Alert);

    // Check if data already exists to prevent duplicate seeding
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      logger.info('Database already contains data. Skipping seeding.');
      await AppDataSource.destroy();
      return;
    }

    logger.info('Seeding database with initial data...');

    // 1. Create Users
    const hashedPassword1 = await hashPassword('password123');
    const hashedPassword2 = await hashPassword('securedevpass');

    const user1 = userRepository.create({
      username: 'john.doe',
      email: 'john.doe@example.com',
      password: hashedPassword1,
      role: 'user',
    });
    await userRepository.save(user1);
    logger.info(`Created user: ${user1.username}`);

    const user2 = userRepository.create({
      username: 'admin.user',
      email: 'admin@example.com',
      password: hashedPassword2,
      role: 'admin',
    });
    await userRepository.save(user2);
    logger.info(`Created admin user: ${user2.username}`);

    // 2. Create Projects
    const project1 = projectRepository.create({
      name: 'Production Services',
      description: 'Critical production APIs and websites.',
      user: user1,
    });
    await projectRepository.save(project1);
    logger.info(`Created project: ${project1.name} for ${user1.username}`);

    const project2 = projectRepository.create({
      name: 'Development Sandbox',
      description: 'Staging and testing environments.',
      user: user1,
    });
    await projectRepository.save(project2);
    logger.info(`Created project: ${project2.name} for ${user1.username}`);

    const adminProject = projectRepository.create({
      name: 'Admin Dashboard Services',
      description: 'Internal admin tools monitored by admin.',
      user: user2,
    });
    await projectRepository.save(adminProject);
    logger.info(`Created project: ${adminProject.name} for ${user2.username}`);

    // 3. Create Monitors
    const monitor1 = monitorRepository.create({
      name: 'Google Homepage',
      url: 'https://www.google.com',
      method: 'GET',
      intervalSeconds: 60,
      status: 'active',
      project: project1,
    });
    await monitorRepository.save(monitor1);
    logger.info(`Created monitor: ${monitor1.name} for project ${project1.name}`);

    const monitor2 = monitorRepository.create({
      name: 'Failing Endpoint (Simulated)',
      url: 'https://httpstat.us/500', // This URL always returns 500
      method: 'GET',
      intervalSeconds: 30,
      status: 'active',
      project: project1,
    });
    await monitorRepository.save(monitor2);
    logger.info(`Created monitor: ${monitor2.name} for project ${project1.name}`);

    const monitor3 = monitorRepository.create({
      name: 'Slow API Endpoint (Simulated)',
      url: 'https://httpstat.us/200?sleep=1000', // This URL returns 200 after 1 second
      method: 'GET',
      intervalSeconds: 60,
      status: 'active',
      project: project2,
    });
    await monitorRepository.save(monitor3);
    logger.info(`Created monitor: ${monitor3.name} for project ${project2.name}`);

    const monitor4 = monitorRepository.create({
      name: 'Paused Test Site',
      url: 'https://example.com',
      method: 'GET',
      intervalSeconds: 300,
      status: 'paused',
      project: project2,
    });
    await monitorRepository.save(monitor4);
    logger.info(`Created monitor: ${monitor4.name} for project ${project2.name}`);


    // 4. Create Alerts
    const alert1 = alertRepository.create({
      monitor: monitor1,
      type: 'response_time',
      threshold: 500, // ms
      condition: 'gt',
      message: 'Google response time over 500ms!',
      isActive: true,
      status: 'ok',
    });
    await alertRepository.save(alert1);
    logger.info(`Created alert for monitor: ${monitor1.name}`);

    const alert2 = alertRepository.create({
      monitor: monitor2,
      type: 'status_code',
      threshold: 400,
      condition: 'gte', // >= 400
      message: 'Failing Endpoint returning error status code!',
      isActive: true,
      status: 'ok',
    });
    await alertRepository.save(alert2);
    logger.info(`Created alert for monitor: ${monitor2.name}`);

    const alert3 = alertRepository.create({
      monitor: monitor3,
      type: 'response_time',
      threshold: 1500, // ms
      condition: 'gt', // > 1500ms
      message: 'Slow API response time over 1500ms!',
      isActive: true,
      status: 'ok',
    });
    await alertRepository.save(alert3);
    logger.info(`Created alert for monitor: ${monitor3.name}`);


    logger.info('Database seeding complete!');

  } catch (error) {
    logger.error('Database seeding failed:', error);
  } finally {
    await AppDataSource.destroy();
    logger.info('Database connection closed.');
  }
}

seed();
```