```typescript
import { Module } from '@nestjs/common';
import { WinstonLogger } from './winston.config';
import { LoggerService } from './logger.service';

@Module({
  imports: [WinstonLogger],
  providers: [LoggerService],
  exports: [LoggerService, WinstonLogger], // Export WinstonLogger to be used by other modules (e.g., HttpExceptionFilter)
})
export class LoggerModule {}
```