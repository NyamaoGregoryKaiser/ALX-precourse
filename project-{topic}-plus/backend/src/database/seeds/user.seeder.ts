```typescript
import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import * as argon2 from 'argon2';
import { LoggerService } from '../../logger/logger.service';

export class UserSeeder {
  private readonly logger = new LoggerService();

  public async run(dataSource: DataSource): Promise<any> {
    const userRepository = dataSource.getRepository(User);

    const existingAdmin = await userRepository.findOne({
      where: { username: 'admin' },
    });

    if (!existingAdmin) {
      const hashedPassword = await argon2.hash('adminpassword'); // Use a strong password in production

      const adminUser = userRepository.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'admin',
      });

      await userRepository.save(adminUser);
      this.logger.log('Admin user seeded.', 'UserSeeder');
    } else {
      this.logger.log('Admin user already exists, skipping seed.', 'UserSeeder');
    }

    const existingUser = await userRepository.findOne({
      where: { username: 'testuser' },
    });

    if (!existingUser) {
      const hashedPassword = await argon2.hash('password');

      const testUser = userRepository.create({
        username: 'testuser',
        email: 'user@example.com',
        password: hashedPassword,
        role: 'user',
      });

      await userRepository.save(testUser);
      this.logger.log('Test user seeded.', 'UserSeeder');
    } else {
      this.logger.log('Test user already exists, skipping seed.', 'UserSeeder');
    }
  }
}
```