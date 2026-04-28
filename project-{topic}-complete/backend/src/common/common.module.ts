import { Module } from '@nestjs/common';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { AppLoggerModule } from './logger/app-logger.module';
import { HttpCacheInterceptor } from './interceptors/cache.interceptor';

@Module({
  imports: [AppLoggerModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // Apply roles guard globally, but individual routes can override
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter, // Global exception handler
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: HttpCacheInterceptor, // Global caching for GET requests
    },
  ],
  exports: [],
})
export class CommonModule {}