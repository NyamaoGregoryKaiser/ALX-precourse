```typescript
import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CacheModule } from '@nestjs/cache-manager';
import * as redisStore from 'cache-manager-redis-yet';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { NotificationsModule } from './notifications/notifications.module';
import configuration from './config/configuration';
import { validationSchema } from './config/validation-schema';
import { User } from './users/entities/user.entity';
import { Project } from './projects/entities/project.entity';
import { Task } from './tasks/entities/task.entity';
import { Comment } from './comments/entities/comment.entity';
import { Notification } from './notifications/entities/notification.entity';
import { LoggerModule } from './logging/logger.module';
import { LoggerMiddleware } from './logging/logger.middleware';

@Module({
  imports: [
    // Configure ConfigModule to load environment variables
    ConfigModule.forRoot({
      isGlobal: true, // Makes ConfigService available globally
      load: [configuration], // Load custom configuration
      validationSchema: validationSchema, // Validate environment variables
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`, // Load specific .env file
    }),

    // Configure TypeORM for database connection
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('database.host'),
        port: configService.get<number>('database.port'),
        username: configService.get<string>('database.username'),
        password: configService.get<string>('database.password'),
        database: configService.get<string>('database.name'),
        entities: [User, Project, Task, Comment, Notification], // Register entities
        synchronize: configService.get<boolean>('database.synchronize'), // Auto-sync schema (NOT recommended for production)
        logging: configService.get<boolean>('database.logging'), // Log SQL queries
        migrations: [__dirname + '/database/migrations/*.ts'], // Path to migration files
        migrationsRun: false, // Do not run migrations automatically in production
      }),
      inject: [ConfigService],
    }),

    // Configure Throttler for rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ttl: configService.get<number>('throttler.ttl'),
        limit: configService.get<number>('throttler.limit'),
      }),
    }),

    // Configure CacheModule with Redis store
    CacheModule.registerAsync({
      isGlobal: true, // Make cache manager available globally
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('redis.host'),
        port: configService.get<number>('redis.port'),
        password: configService.get<string>('redis.password'), // If Redis requires auth
        ttl: configService.get<number>('redis.ttl'), // Default TTL for cache entries
      }),
    }),

    // Application Modules
    AuthModule,
    UsersModule,
    ProjectsModule,
    TasksModule,
    CommentsModule,
    NotificationsModule,
    LoggerModule, // Custom Logger module
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply LoggerMiddleware to all routes
    consumer
      .apply(LoggerMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
```