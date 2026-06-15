```typescript
import { Module, CacheModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import * as Joi from 'joi';
import * as redisStore from 'cache-manager-redis-yet';

import { AppConfigModule } from './config/app.config.module';
import { DatabaseConfigService } from './config/database.config.service';
import { validationSchema } from './config/validation-schema';

import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CategoriesModule } from './categories/categories.module';
import { TasksModule } from './tasks/tasks.module';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CustomLogger } from './common/logger/custom-logger';
import { CacheInterceptor } from '@nestjs/cache-manager';

@Module({
  imports: [
    // Configure .env file loading and validation
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env`,
      validationSchema: validationSchema,
      validationOptions: {
        abortEarly: true, // Stop validation on first error
      },
    }),
    // TypeORM database connection
    TypeOrmModule.forRootAsync({
      imports: [AppConfigModule],
      useClass: DatabaseConfigService,
      inject: [DatabaseConfigService],
    }),
    // Throttler for rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        ttl: config.get<number>('THROTTLER_TTL'),
        limit: config.get<number>('THROTTLER_LIMIT'),
      }),
    }),
    // Cache manager (Redis)
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST'),
        port: configService.get<number>('REDIS_PORT'),
        ttl: configService.get<number>('REDIS_TTL'),
      }),
      isGlobal: true, // Make CacheModule available globally
    }),
    AuthModule,
    UsersModule,
    CategoriesModule,
    TasksModule,
  ],
  providers: [
    // Global Throttler Guard for rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Cache Interceptor (can be overridden per route)
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    CustomLogger, // Provide custom logger globally
  ],
})
export class AppModule {}
```