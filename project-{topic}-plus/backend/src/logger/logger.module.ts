```typescript
import { Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Module({
  providers: [LoggerService],
  exports: [LoggerService], // Make LoggerService available globally
})
export class LoggerModule {}
```