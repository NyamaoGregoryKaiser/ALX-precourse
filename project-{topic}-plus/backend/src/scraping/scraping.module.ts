```typescript
import { Module } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { ScrapingController } from './scraping.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScrapingJob } from './entities/scraping-job.entity';
import { ScrapingResult } from './entities/scraping-result.entity';
import { ScrapingTask } from './entities/scraping-task.entity';
import { JobsModule } from '../jobs/jobs.module';
import { BullMQModule } from '@nestjs/bullmq';
import { JOB_QUEUE_NAME } from '../jobs/job-names.enum';
import { ScrapingProcessor } from './processors/scraping.processor';
import { ScraperStrategyFactory } from './strategies/scraper-strategy.factory';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ScrapingSchedulerService } from './scraping-scheduler.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScrapingJob, ScrapingResult, ScrapingTask]),
    JobsModule, // For adding jobs to the queue
    LoggerModule,
    // Register the processor for the scraping queue
    BullMQModule.forFeature({
      name: JOB_QUEUE_NAME.SCRAPING_QUEUE,
      processors: [ScrapingProcessor], // Register the scraping job processor
    }),
    ScheduleModule, // For cron jobs
    ConfigModule, // To inject ConfigService into ScraperStrategyFactory
  ],
  providers: [
    ScrapingService,
    ScrapingProcessor, // This is explicitly provided here
    ScraperStrategyFactory,
    ScrapingSchedulerService,
  ],
  controllers: [ScrapingController],
  exports: [ScrapingService],
})
export class ScrapingModule {}
```