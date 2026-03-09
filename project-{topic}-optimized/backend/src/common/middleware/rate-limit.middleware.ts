```typescript
import { Injectable, NestMiddleware, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { ConfigService } from '@nestjs/config';
import { CustomLogger } from '../logger/custom-logger.service';

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private rateLimiter: RateLimiterMemory;
  private logger: CustomLogger;

  constructor(private configService: ConfigService) {
    this.logger = new CustomLogger(configService); // Initialize custom logger
    this.rateLimiter = new RateLimiterMemory({
      points: this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100), // Max requests per period
      duration: this.configService.get<number>('RATE_LIMIT_TTL', 60), // Duration in seconds
      blockDuration: this.configService.get<number>('RATE_LIMIT_BLOCK_DURATION', 60 * 5), // Block for 5 minutes if exceeded
    });
  }

  async use(req: Request, res: Response, next: NextFunction) {
    try {
      // Use client IP address for rate limiting
      // In a production environment behind a proxy, use X-Forwarded-For or similar header
      await this.rateLimiter.consume(req.ip);
      next();
    } catch (rateLimiterRes) {
      const secondsRemaining = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
      res.set('Retry-After', String(secondsRemaining));
      res.status(HttpStatus.TOO_MANY_REQUESTS).json({
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Too many requests. Please try again later.',
        retryAfter: secondsRemaining,
      });
      this.logger.warn(
        `Rate limit exceeded for IP: ${req.ip} on ${req.method} ${req.originalUrl}`,
        'RateLimitMiddleware',
      );
    }
  }
}
```