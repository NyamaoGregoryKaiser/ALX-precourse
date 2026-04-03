```typescript
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { JOB_QUEUE_NAME, JOB_NAMES } from '../../jobs/job-names.enum';
import { ScrapingService } from '../scraping.service';
import { ScrapingTaskStatus } from '../entities/scraping-task.entity';
import { ScrapingJobPayload } from '../dto/scraping-job-payload.dto';
import { LoggerService } from '../../logger/logger.service';
import { ScraperStrategyFactory } from '../strategies/scraper-strategy.factory';

@Processor(JOB_QUEUE_NAME.SCRAPING_QUEUE)
export class ScrapingProcessor extends WorkerHost {
  constructor(
    private readonly scrapingService: ScrapingService,
    private readonly logger: LoggerService,
    private readonly scraperStrategyFactory: ScraperStrategyFactory,
  ) {
    super();
  }

  async process(job: Job<ScrapingJobPayload, any, string>): Promise<any> {
    const { jobId, taskId, targetUrl, config } = job.data;
    this.logger.log(`Processing scraping job ${jobId}, task ${taskId} for URL: ${targetUrl}`, 'ScrapingProcessor');

    await this.scrapingService.updateScrapingTaskStatus(taskId, ScrapingTaskStatus.PROCESSING);

    try {
      const scraper = this.scraperStrategyFactory.createScraper('puppeteer'); // We can add 'cheerio' later
      const results = await scraper.scrape(targetUrl, config);

      await this.scrapingService.handleScrapingTaskCompletion(
        taskId,
        ScrapingTaskStatus.COMPLETED,
        results,
      );
      this.logger.log(`Scraping job ${jobId}, task ${taskId} completed successfully. Found ${results.length} items.`, 'ScrapingProcessor');
      return { success: true, resultsCount: results.length };
    } catch (error) {
      this.logger.error(
        `Scraping job ${jobId}, task ${taskId} failed: ${error.message}`,
        error.stack,
        'ScrapingProcessor',
      );
      await this.scrapingService.handleScrapingTaskCompletion(
        taskId,
        ScrapingTaskStatus.FAILED,
        [],
        error.message,
      );
      throw error; // Re-throw to indicate job failure to BullMQ
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} completed.`, 'ScrapingProcessor');
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} failed with error: ${error.message}`, error.stack, 'ScrapingProcessor');
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    this.logger.debug(`Job ${job.id} is now active.`, 'ScrapingProcessor');
  }

  @OnWorkerEvent('progress')
  onProgress(job: Job) {
    this.logger.debug(`Job ${job.id} reports progress: ${job.progress}`, 'ScrapingProcessor');
  }
}
```