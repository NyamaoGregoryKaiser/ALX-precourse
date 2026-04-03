```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { BullMQModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ScrapingModule } from './scraping/scraping.module';
import { DatabaseModule } from './database/database.module'; // Contains TypeORM config
import { JobsModule } from './jobs/jobs.module';
import { LoggerModule } from './logger/logger.module';
import { CachingModule } from './caching/caching.module';
import { CacheInterceptor } from './common/interceptors/cache.interceptor';
import { RedisService } from './caching/redis.service'; // For CacheInterceptor provider
import configuration from './config/configuration';
import { validate } from './config/validation';
import { dataSourceOptions } from './database/data-source';

@Module({
  imports: [
    // Config Module: Loads .env, validates, and makes config available
    ConfigModule.forRoot({
      isGlobal: true, // Makes config available throughout the application
      load: [configuration],
      validate, // Use Joi schema for validation
    }),
    // TypeORM Module: Integrates PostgreSQL database
    TypeOrmModule.forRoot(dataSourceOptions),
    // Throttler Module: Rate limiting for API requests
    ThrottlerModule.forRoot({
      ttl: 60, // Default TTL (seconds)
      limit: 100, // Default limit (requests)
    }),
    // BullMQ Module: For job queue management (Redis-backed)
    BullMQModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    // Schedule Module: For cron-based job scheduling
    ScheduleModule.forRoot(),

    // Feature Modules
    AuthModule,
    UsersModule,
    ScrapingModule,
    JobsModule,
    DatabaseModule, // Just for ensuring migrations/seeds are setup, not direct import
    LoggerModule,
    CachingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global Throttler Guard for rate limiting
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    // Global Cache Interceptor (apply carefully, or selectively per controller/route)
    // Providing RedisService here ensures CacheInterceptor can get it via DI
    {
      provide: APP_INTERCEPTOR,
      useClass: CacheInterceptor,
    },
    RedisService, // Make RedisService available for injection if APP_INTERCEPTOR is used like above
  ],
})
export class AppModule {}
```