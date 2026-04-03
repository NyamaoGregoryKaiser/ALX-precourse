```typescript
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { JOB_QUEUE_NAME, JOB_NAMES } from './job-names.enum';
import { ScrapingJobPayload } from '../scraping/dto/scraping-job-payload.dto';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class JobsService {
  constructor(
    @InjectQueue(JOB_QUEUE_NAME.SCRAPING_QUEUE) private scrapingQueue: Queue,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Adds a scraping job to the queue.
   * @param name Name of the job.
   * @param payload Data associated with the job.
   * @param options BullMQ job options (e.g., delay, jobId).
   * @returns The created job object.
   */
  async addScrapingJob(
    jobId: string, // Use scraping job ID as BullMQ job ID for easy lookup
    payload: ScrapingJobPayload,
    options?: { delay?: number },
  ) {
    this.logger.log(
      `Adding scraping job ${payload.jobId} to queue with task ID: ${payload.taskId}. Delay: ${options?.delay || 0}ms`,
      'JobsService',
    );
    return this.scrapingQueue.add(JOB_NAMES.PROCESS_SCRAPING, payload, {
      jobId: jobId, // Use job ID for unique identification in queue
      ...options,
      removeOnComplete: true, // Clean up completed jobs
      removeOnFail: 50, // Keep last 50 failed jobs for inspection
    });
  }
}
```