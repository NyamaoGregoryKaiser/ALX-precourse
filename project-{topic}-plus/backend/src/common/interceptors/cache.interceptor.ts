```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  CACHE_KEY_METADATA,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { RedisService } from '../../caching/redis.service';
import { Reflector } from '@nestjs/core'; // To read custom metadata
import { CACHE_TTL_METADATA } from '../decorators/cache-ttl.decorator';
import { LoggerService } from '../../logger/logger.service';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
    private readonly logger: LoggerService,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest<Request>();
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    // Get cache key from decorator or use request URL
    const cacheKey =
      this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler()) ||
      req.originalUrl;

    // Get TTL from decorator or use default
    const ttl =
      this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) ||
      60; // Default cache TTL in seconds

    if (!cacheKey) {
      return next.handle();
    }

    try {
      const cachedData = await this.redisService.get(cacheKey);
      if (cachedData) {
        this.logger.log(`Cache HIT for key: ${cacheKey}`, 'CacheInterceptor');
        return of(JSON.parse(cachedData));
      }
    } catch (error) {
      this.logger.error(
        `Error getting data from cache for key: ${cacheKey}: ${error.message}`,
        error.stack,
        'CacheInterceptor',
      );
      // Fallback to fetching data from the handler if cache fails
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (response) => {
        if (response) {
          try {
            await this.redisService.set(cacheKey, JSON.stringify(response), ttl);
            this.logger.log(`Cache SET for key: ${cacheKey} with TTL: ${ttl}s`, 'CacheInterceptor');
          } catch (error) {
            this.logger.error(
              `Error setting data to cache for key: ${cacheKey}: ${error.message}`,
              error.stack,
              'CacheInterceptor',
            );
          }
        }
      }),
    );
  }
}
```