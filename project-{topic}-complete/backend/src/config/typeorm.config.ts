import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'development'}` });
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('dotenv').config(); // Load default .env as fallback

export const getTypeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: configService.get<'postgres'>('DATABASE_TYPE', 'postgres'),
  host: configService.get<string>('DATABASE_HOST', 'localhost'),
  port: configService.get<number>('DATABASE_PORT', 5432),
  username: configService.get<string>('DATABASE_USERNAME', 'user'),
  password: configService.get<string>('DATABASE_PASSWORD', 'password'),
  database: configService.get<string>('DATABASE_NAME', 'ml_utilities_db'),
  entities: [path.join(__dirname, '../**/*.entity.{ts,js}')],
  migrations: [path.join(__dirname, '../database/migrations/*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false, // NEVER use synchronize in production. Use migrations instead.
  logging: configService.get<string>('NODE_ENV') === 'development' ? ['query', 'error', 'schema'] : ['error'],
  cli: {
    migrationsDir: 'src/database/migrations',
  },
});

// For TypeORM CLI to work without NestJS application context
export default getTypeOrmConfig(new ConfigService());