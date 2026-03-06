```typescript
import 'reflect-metadata';
import { AppDataSource } from './config/database';
import { logger } from './utils/logger';
import { UserRole, Role } from './entities/Role';
import { User } from './entities/User';
import { hashPassword } from './utils/password';
import { Post } from './entities/Post';

export const initializeDataSource = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Data Source has been initialized!');
    }
  } catch (err) {
    logger.error('Error during Data Source initialization', err);
    process.exit(1);
  }
};

// Seed function (can be called via a script or on dev server start)
export const seedDatabase = async () => {
  await initializeDataSource(); // Ensure data source is initialized

  const roleRepository = AppDataSource.getRepository(Role);
  const userRepository = AppDataSource.getRepository(User);
  const postRepository = AppDataSource.getRepository(Post);

  logger.info('Seeding roles...');
  const existingRoles = await roleRepository.find();

  if (!existingRoles.some(r => r.name === UserRole.ADMIN)) {
    const adminRole = roleRepository.create({ name: UserRole.ADMIN, description: 'Administrator role with full access' });
    await roleRepository.save(adminRole);
    logger.info(`Role '${UserRole.ADMIN}' created.`);
  }

  if (!existingRoles.some(r => r.name === UserRole.USER)) {
    const userRole = roleRepository.create({ name: UserRole.USER, description: 'Standard user role' });
    await roleRepository.save(userRole);
    logger.info(`Role '${UserRole.USER}' created.`);
  }

  // Fetch created roles to assign to users
  const adminRole = await roleRepository.findOneBy({ name: UserRole.ADMIN });
  const userRole = await roleRepository.findOneBy({ name: UserRole.USER });

  if (!adminRole || !userRole) {
    logger.error('Admin or User roles not found after seeding. Cannot create users.');
    return;
  }

  logger.info('Seeding users...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  let adminUser = await userRepository.findOneBy({ email: adminEmail });

  if (!adminUser) {
    const hashedPassword = await hashPassword(process.env.ADMIN_PASSWORD || 'adminpassword');
    adminUser = userRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      email: adminEmail,
      password: hashedPassword,
      isEmailVerified: true,
      role: adminRole,
    });
    await userRepository.save(adminUser);
    logger.info(`Admin user '${adminEmail}' created.`);
  } else {
    logger.info(`Admin user '${adminEmail}' already exists.`);
  }

  const normalUserEmail = process.env.USER_EMAIL || 'user@example.com';
  let normalUser = await userRepository.findOneBy({ email: normalUserEmail });

  if (!normalUser) {
    const hashedPassword = await hashPassword(process.env.USER_PASSWORD || 'userpassword');
    normalUser = userRepository.create({
      firstName: 'Normal',
      lastName: 'User',
      email: normalUserEmail,
      password: hashedPassword,
      isEmailVerified: true,
      role: userRole,
    });
    await userRepository.save(normalUser);
    logger.info(`Normal user '${normalUserEmail}' created.`);
  } else {
    logger.info(`Normal user '${normalUserEmail}' already exists.`);
  }

  logger.info('Seeding posts...');
  const existingPosts = await postRepository.find();
  if (existingPosts.length === 0) {
    if (adminUser) {
      const post1 = postRepository.create({
        title: 'Admin\'s First Post',
        content: 'This is a post created by the admin user.',
        author: adminUser,
      });
      await postRepository.save(post1);
      logger.info('Post "Admin\'s First Post" created.');
    }

    if (normalUser) {
      const post2 = postRepository.create({
        title: 'User\'s Welcome Post',
        content: 'Hello world from a regular user!',
        author: normalUser,
      });
      await postRepository.save(post2);
      logger.info('Post "User\'s Welcome Post" created.');
    }
  } else {
    logger.info('Posts already exist, skipping seeding.');
  }

  logger.info('Database seeding completed.');
};

// If this file is executed directly (e.g., `ts-node src/data-source.ts seed`), run the seed function
if (require.main === module && process.argv[2] === 'seed') {
  seedDatabase().then(() => {
    logger.info('Seed script finished.');
    AppDataSource.destroy();
  }).catch(error => {
    logger.error('Seed script failed:', error);
    AppDataSource.destroy();
    process.exit(1);
  });
}
```