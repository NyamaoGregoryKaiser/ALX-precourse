```typescript
import { DataSource } from 'typeorm';
import { User, UserRole } from '../entities/User';
import * as bcrypt from 'bcryptjs';
import { env } from '../../config/env.config';
import { logger } from '../../shared/utils/logger';

export class UserSeeder {
  constructor(private dataSource: DataSource) {}

  public async run(): Promise<void> {
    const userRepository = this.dataSource.getRepository(User);

    // Check if admin user already exists to prevent duplicates
    const existingAdmin = await userRepository.findOneBy({ email: env.ADMIN_EMAIL });
    if (existingAdmin) {
      logger.info('Admin user already exists. Skipping creation.');
      return;
    }

    // Hash admin password
    const hashedPassword = await bcrypt.hash(env.ADMIN_PASSWORD, 10);

    // Create Admin User
    const adminUser = userRepository.create({
      username: env.ADMIN_USERNAME,
      email: env.ADMIN_EMAIL,
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await userRepository.save(adminUser);
    logger.info(`Admin user created: ${adminUser.email}`);

    // Create some regular users
    const user1Password = await bcrypt.hash('user1password', 10);
    const user2Password = await bcrypt.hash('user2password', 10);

    const user1 = userRepository.create({
      username: 'johndoe',
      email: 'john.doe@example.com',
      password: user1Password,
      role: UserRole.USER,
    });
    const user2 = userRepository.create({
      username: 'janedoe',
      email: 'jane.doe@example.com',
      password: user2Password,
      role: UserRole.USER,
    });

    await userRepository.save([user1, user2]);
    logger.info('Regular users created.');
  }
}
```