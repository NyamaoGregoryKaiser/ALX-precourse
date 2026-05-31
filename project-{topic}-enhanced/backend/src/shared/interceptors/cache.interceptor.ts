```typescript
import { Injectable, ExecutionContext, CallHandler } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { Observable } from 'rxjs';

@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  protected is               RequestCacheable(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    // Cache only GET requests for public data
    return req.method === 'GET' && !req.user; // Don't cache authenticated requests by default
  }

  // Optionally, you can customize the cache key
  protected generateCacheKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest();
    return `${request.url}_${JSON.stringify(request.query)}`;
  }

  // Example: Invalidate cache for specific paths after mutations
  // This would typically be triggered by specific services after a write operation.
  // Not directly part of the interceptor but a related concept.
  // For example, in a post service after create/update/delete, you'd inject CacheManager
  // and call `cacheManager.del('posts_cache_key')`
}
```