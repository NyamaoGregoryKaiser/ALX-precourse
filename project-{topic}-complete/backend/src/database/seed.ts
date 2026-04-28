import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Role } from '../common/enums/role.enum';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { AppLogger } from '../common/logger/app-logger.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const configService = app.get(ConfigService);
  const logger = app.get(AppLogger);

  logger.log('Seeding initial data...');

  const userRepository = dataSource.getRepository(User);

  // Clear existing users to ensure idempotency for development
  // In production, you might want to check for existence before creating
  try {
    if (process.env.NODE_ENV === 'development') {
        // await userRepository.delete({}); // Dangerous, only for development reset
        logger.warn('Skipping user deletion for seeding. Manual deletion might be needed in dev.');
    }

    const adminEmail = configService.get<string>('ADMIN_EMAIL');
    const adminPassword = configService.get<string>('ADMIN_PASSWORD');

    if (!adminEmail || !adminPassword) {
      logger.error('ADMIN_EMAIL or ADMIN_PASSWORD not set in .env. Skipping admin user seed.');
      return;
    }

    let adminUser = await userRepository.findOne({ where: { email: adminEmail } });

    if (!adminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      adminUser = userRepository.create({
        username: 'admin',
        email: adminEmail,
        password: hashedPassword,
        role: Role.Admin,
      });
      await userRepository.save(adminUser);
      logger.log(`Admin user "${adminEmail}" created successfully.`);
    } else {
      logger.log(`Admin user "${adminEmail}" already exists. Skipping.`);
    }

    // Add more seed data here if needed (e.g., sample datasets, models)

  } catch (error) {
    logger.error('Failed to seed data:', error.stack);
  } finally {
    await app.close();
    logger.log('Seeding complete.');
  }
}

bootstrap();