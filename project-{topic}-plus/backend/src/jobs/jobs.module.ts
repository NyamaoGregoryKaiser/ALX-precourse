```typescript
import { Module } from '@nestjs/common';
import { BullMQModule } from '@nestjs/bullmq';
import { JobsService } from './jobs.service';
import { JOB_QUEUE_NAME } from './job-names.enum';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullMQModule.registerQueueAsync({
      name: JOB_QUEUE_NAME.SCRAPING_QUEUE,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
        defaultJobOptions: {
          attempts: 3, // Retry failed jobs 3 times
          backoff: {
            type: 'exponential',
            delay: 1000, // 1s, 2s, 4s delays
          },
        },
      }),
    }),
  ],
  providers: [JobsService],
  exports: [JobsService, BullMQModule], // Export BullMQModule for the processor
})
export class JobsModule {}
```