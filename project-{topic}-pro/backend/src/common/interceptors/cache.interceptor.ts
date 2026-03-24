```typescript
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Cache } from 'cache-manager';
import { Reflector } from '@nestjs/core';
import { CACHE_KEY_METADATA, CACHE_TTL_METADATA } from '../decorators/cache.decorator'; // Custom decorators

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const isGetRequest = request.method === 'GET';

    // Check if caching is explicitly disabled for this route
    const cacheKey = this.reflector.get<string>(CACHE_KEY_METADATA, context.getHandler());
    if (!cacheKey) {
      return next.handle(); // Skip caching if no cache key is defined
    }

    const ttl = this.reflector.get<number>(CACHE_TTL_METADATA, context.getHandler()) || 3600; // Default 1 hour

    // Generate a unique cache key for the request
    // You might want to include query params, user ID, etc. for more granular caching
    const fullCacheKey = `${cacheKey}:${request.originalUrl}`;

    if (isGetRequest) {
      const cachedData = await this.cacheManager.get(fullCacheKey);
      if (cachedData) {
        console.log(`Cache hit for key: ${fullCacheKey}`);
        return of(cachedData); // Return cached data
      }
    }

    return next.handle().pipe(
      tap(async (data) => {
        if (isGetRequest) {
          console.log(`Cache miss for key: ${fullCacheKey}, caching data.`);
          await this.cacheManager.set(fullCacheKey, data, ttl);
        } else {
          // For non-GET requests (POST, PUT, DELETE), invalidate relevant caches
          // This is a simplistic invalidation. A more robust solution might involve tags or patterns.
          console.log(`Non-GET request, clearing cache for pattern: ${cacheKey}`);
          // await this.cacheManager.del(fullCacheKey); // Delete this specific entry
          // Or more broadly:
          const keys = await this.cacheManager.store.keys(`${cacheKey}:*`);
          await Promise.all(keys.map(key => this.cacheManager.del(key)));
        }
      }),
    );
  }
}
```