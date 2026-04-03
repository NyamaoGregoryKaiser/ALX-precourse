```typescript
import { Module, CacheModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-redis-yet';
import { RedisService } from './redis.service';

@Module({
  imports: [
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('redis.host'),
        port: configService.get<number>('redis.port'),
        ttl: 60, // default ttl in seconds
      }),
      isGlobal: true, // Makes the cache manager available globally
    }),
  ],
  providers: [RedisService],
  exports: [RedisService], // Export RedisService for direct use/injection
})
export class CachingModule {}
```