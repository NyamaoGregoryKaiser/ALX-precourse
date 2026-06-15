```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config'; // Import ConfigService
import { CustomLogger } from '../common/logger/custom-logger';

/**
 * AppConfigModule provides a centralized place to inject ConfigService
 * and make it available for other modules that need environment variables
 * but don't want to import ConfigModule directly.
 */
@Module({
  imports: [ConfigModule],
  providers: [ConfigService, CustomLogger], // Make ConfigService injectable
  exports: [ConfigService], // Export ConfigService to make it available to other modules
})
export class AppConfigModule {}
```