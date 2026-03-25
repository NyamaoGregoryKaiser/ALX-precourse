import { CacheInterceptor, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';

/**
 * Custom cache interceptor to generate dynamic cache keys based on request parameters.
 * This extends NestJS's built-in CacheInterceptor.
 */
@Injectable()
export class HttpCacheInterceptor extends CacheInterceptor {
  /**
   * Generates a unique cache key for each request.
   * The key includes the request method, URL, and query parameters to ensure
   * different requests (e.g., with different filters) have distinct cache entries.
   * @param context The execution context of the request.
   * @returns {string} A unique cache key.
   */
  protected getCacheKey(context: ExecutionContext): string {
    const request = context.switchToHttp().getRequest<Request>();
    const { url, method, query } = request;

    // Sort query params for consistent cache keys regardless of order
    const sortedQuery = Object.keys(query)
      .sort()
      .map((key) => `${key}=${query[key]}`)
      .join('&');

    return `${method}-${url}${sortedQuery ? '?' + sortedQuery : ''}`;
  }
}