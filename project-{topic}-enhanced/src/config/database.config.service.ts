```typescript
import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Task } from '../tasks/entities/task.entity';
import { CustomLogger } from '../common/logger/custom-logger';

/**
 * DatabaseConfigService provides TypeORM configuration dynamically
 * using NestJS ConfigService to retrieve environment variables.
 */
@Injectable()
export class DatabaseConfigService implements TypeOrmOptionsFactory {
  constructor(
    private configService: ConfigService,
    private readonly logger: CustomLogger,
  ) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    this.logger.log('Creating TypeORM options...', DatabaseConfigService.name);
    return {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE_HOST'),
      port: this.configService.get<number>('DATABASE_PORT'),
      username: this.configService.get<string>('DATABASE_USERNAME'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME'),
      entities: [User, Category, Task], // List all your entities here
      synchronize: this.configService.get<boolean>('DATABASE_SYNCHRONIZE'), // Set to false in production and use migrations
      logging: this.configService.get<boolean>('DATABASE_LOGGING'),
      migrations: [__dirname + '/../database/migrations/*.ts'], // Path to your migration files
      migrationsRun: false, // Do not automatically run migrations on application start
    };
  }
}
```