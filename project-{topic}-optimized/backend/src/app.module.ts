import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Joi from 'joi';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { configuration } from './config/configuration';
import { validationSchema } from './config/validation.schema';
import { User } from './users/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { Task } from './tasks/entities/task.entity';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-store';
import { ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from './utils/logger';

/**
 * Root module for the NestJS application.
 * It imports and configures all major modules and global settings.
 */
@Module({
  imports: [
    // Configuration Module: Loads environment variables and provides validation
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
      load: [configuration], // Custom configuration loader
      validationSchema, // Joi schema for environment variable validation
      validationOptions: {
        allowUnknown: true, // Allow unknown keys that will be ignored
        abortEarly: true, // Abort validation on first error
      },
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`, // Load specific .env file
    }),

    // TypeORM Module: Connects to the database and registers entities
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: configService.get<any>('DATABASE_TYPE'),
        host: configService.get<string>('DATABASE_HOST'),
        port: configService.get<number>('DATABASE_PORT'),
        username: configService.get<string>('DATABASE_USERNAME'),
        password: configService.get<string>('DATABASE_PASSWORD'),
        database: configService.get<string>('DATABASE_NAME'),
        entities: [User, Project, Task], // Register all entities
        synchronize: configService.get<boolean>('NODE_ENV') === 'development', // Auto-sync schema in dev, use migrations in prod
        logging: configService.get<boolean>('NODE_ENV') === 'development', // Log SQL queries in dev
        migrations: [__dirname + '/migrations/*{.ts,.js}'], // Path to migration files
        migrationsRun: false, // Don't run migrations automatically, use CLI
        autoLoadEntities: true, // Automatically load entities from TypeOrmModule.forFeature
      }),
    }),

    // Cache Module: Integrates Redis for caching
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        ttl: configService.get<number>('REDIS_TTL'), // Time-to-live for cached items
      }),
      isGlobal: true, // Make cache manager available globally
    }),

    // Throttler Module: Rate limiting for API endpoints
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('THROTTLE_TTL'),
        limit: configService.get<number>('THROTTLE_LIMIT'),
      }),
    }),

    // Custom Logger Module (Winston)
    LoggerModule,

    // Feature Modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}