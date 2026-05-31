```typescript
import { DataSourceOptions, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Category } from '../categories/entities/category.entity';
import { Post } from '../posts/entities/post.entity';
import { SeederOptions } from 'typeorm-extension';

// This is for NestJS TypeOrmModule.forRootAsync
@Injectable()
export class TypeOrmConfigService implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    return {
      type: 'postgres',
      host: this.configService.get<string>('DATABASE.HOST'),
      port: this.configService.get<number>('DATABASE.PORT'),
      username: this.configService.get<string>('DATABASE.USERNAME'),
      password: this.configService.get<string>('DATABASE.PASSWORD'),
      database: this.configService.get<string>('DATABASE.NAME'),
      entities: [User, Category, Post],
      synchronize: this.configService.get<boolean>('DATABASE.SYNCHRONIZE'), // NEVER use true in production
      logging: this.configService.get<boolean>('DATABASE.LOGGING'),
      migrations: ['dist/src/database/migrations/*.js'],
      migrationsRun: false, // Control migrations manually
      autoLoadEntities: true, // Automatically load entities
    };
  }
}

// This is for TypeORM CLI (for migrations and seeding)
const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'cms_db',
  entities: ['dist/**/*.entity.js'], // Point to compiled entities
  synchronize: false, // Ensure this is false for migrations
  migrations: ['dist/src/database/migrations/*.js'],
  seeds: ['dist/src/database/seeds/*.js'], // Point to compiled seeds
  factories: [], // No factories for simple seeds
};

export const AppDataSource = new DataSource(dataSourceOptions);
```