import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  CACHE_MANAGER,
  Inject,
  Logger,
} from '@nestjs/common';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Cache } from 'cache-manager';

@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(HttpCacheInterceptor.name);

  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;

    // Only cache GET requests
    if (method !== 'GET') {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(url);
    const cachedResponse = await this.cacheManager.get(cacheKey);

    if (cachedResponse) {
      this.logger.debug(`Cache hit for key: ${cacheKey}`);
      return of(cachedResponse); // Return cached data
    }

    return next.handle().pipe(
      tap(async (response) => {
        this.logger.debug(`Caching response for key: ${cacheKey}`);
        await this.cacheManager.set(cacheKey, response); // Cache the response
      }),
    );
  }

  private generateCacheKey(url: string): string {
    return `http-cache:${url}`;
  }
}