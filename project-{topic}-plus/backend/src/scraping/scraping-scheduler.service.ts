```typescript
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { CronJob } from 'cron';
import { SchedulerRegistry } from '@nestjs/schedule';
import { ScrapingJob } from './entities/scraping-job.entity';
import { LoggerService } from '../logger/logger.service';
import { ScrapingService } from './scraping.service'; // To enqueue tasks

@Injectable()
export class ScrapingSchedulerService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private schedulerRegistry: SchedulerRegistry,
    private readonly logger: LoggerService,
    private readonly scrapingService: ScrapingService, // Use forwardRef if circular dependency
  ) {}

  onModuleInit() {
    this.logger.log('ScrapingSchedulerService initialized. Loading existing schedules.', 'ScrapingSchedulerService');
    // On application startup, load and schedule all existing jobs with a cron expression
    this.loadExistingSchedules();
  }

  onModuleDestroy() {
    this.logger.log('ScrapingSchedulerService destroyed. Stopping all scheduled jobs.', 'ScrapingSchedulerService');
    this.stopAllScheduledJobs();
  }

  private async loadExistingSchedules() {
    const scheduledJobs = await this.scrapingService.getScheduledJobs();
    for (const job of scheduledJobs) {
      this.scheduleJob(job);
    }
    this.logger.log(`Loaded and scheduled ${scheduledJobs.length} existing jobs.`, 'ScrapingSchedulerService');
  }

  async scheduleJob(job: ScrapingJob): Promise<void> {
    if (!job.scheduleCron) {
      this.logger.warn(`Job ${job.id} does not have a cron schedule. Skipping.`, 'ScrapingSchedulerService');
      return;
    }

    // Stop existing job with the same name if it exists, to prevent duplicates on update
    this.stopScheduledJob(job.id);

    const cronJob = new CronJob(job.scheduleCron, async () => {
      this.logger.log(`Executing scheduled job ${job.name} (ID: ${job.id})`, 'ScrapingSchedulerService');
      try {
        await this.scrapingService.enqueueScrapingTask(job.id);
        const nextRun = cronJob.nextDates().toDate();
        await this.scrapingService.updateScrapingJobNextRun(job.id, nextRun);
      } catch (error) {
        this.logger.error(`Error processing scheduled job ${job.id}: ${error.message}`, error.stack, 'ScrapingSchedulerService');
      }
    });

    try {
      this.schedulerRegistry.addCronJob(job.id, cronJob);
      cronJob.start();
      const nextRun = cronJob.nextDates().toDate();
      await this.scrapingService.updateScrapingJobNextRun(job.id, nextRun);
      this.logger.log(`Job ${job.name} (ID: ${job.id}) scheduled with cron: ${job.scheduleCron}. Next run: ${nextRun}`, 'ScrapingSchedulerService');
    } catch (error) {
      this.logger.error(
        `Failed to schedule job ${job.id} with cron ${job.scheduleCron}: ${error.message}`,
        error.stack,
        'ScrapingSchedulerService',
      );
      // Revert job status if scheduling failed
      await this.scrapingService.updateScrapingJobNextRun(job.id, null);
    }
  }

  stopScheduledJob(jobId: string): void {
    try {
      if (this.schedulerRegistry.doesExist('cron', jobId)) {
        this.schedulerRegistry.deleteCronJob(jobId);
        this.logger.log(`Stopped scheduled job ID: ${jobId}`, 'ScrapingSchedulerService');
      }
    } catch (error) {
      this.logger.error(`Error stopping scheduled job ${jobId}: ${error.message}`, error.stack, 'ScrapingSchedulerService');
    }
  }

  stopAllScheduledJobs(): void {
    const jobs = this.schedulerRegistry.getCronJobs();
    jobs.forEach((job, name) => {
      job.stop();
      this.logger.log(`Stopped scheduled job: ${name}`, 'ScrapingSchedulerService');
    });
  }
}
```