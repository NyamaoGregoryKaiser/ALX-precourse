```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateScrapingJobDto } from './dto/create-scraping-job.dto';
import { UpdateScrapingJobDto } from './dto/update-scraping-job.dto';
import { ScrapingJob, ScrapingJobStatus } from './entities/scraping-job.entity';
import { ScrapingResult } from './entities/scraping-result.entity';
import { ScrapingTask, ScrapingTaskStatus } from './entities/scraping-task.entity';
import { JobsService } from '../jobs/jobs.service';
import { LoggerService } from '../logger/logger.service';
import { ScrapingSchedulerService } from './scraping-scheduler.service';

@Injectable()
export class ScrapingService {
  constructor(
    @InjectRepository(ScrapingJob)
    private scrapingJobRepository: Repository<ScrapingJob>,
    @InjectRepository(ScrapingResult)
    private scrapingResultRepository: Repository<ScrapingResult>,
    @InjectRepository(ScrapingTask)
    private scrapingTaskRepository: Repository<ScrapingTask>,
    private readonly jobsService: JobsService,
    private readonly logger: LoggerService,
    private readonly schedulerService: ScrapingSchedulerService,
  ) {}

  async createScrapingJob(
    userId: string,
    createScrapingJobDto: CreateScrapingJobDto,
  ): Promise<ScrapingJob> {
    const newJob = this.scrapingJobRepository.create({
      ...createScrapingJobDto,
      userId: userId,
      status: createScrapingJobDto.scheduleCron
        ? ScrapingJobStatus.SCHEDULED
        : ScrapingJobStatus.PENDING,
    });
    await this.scrapingJobRepository.save(newJob);
    this.logger.log(`Scraping job created: ${newJob.name} (ID: ${newJob.id}) by user ${userId}`, 'ScrapingService');

    if (newJob.scheduleCron) {
      await this.schedulerService.scheduleJob(newJob);
    } else {
      await this.enqueueScrapingTask(newJob.id); // For one-time jobs, enqueue immediately
    }

    return newJob;
  }

  async findAllScrapingJobs(userId: string): Promise<ScrapingJob[]> {
    return this.scrapingJobRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOneScrapingJob(jobId: string, userId: string): Promise<ScrapingJob> {
    const job = await this.scrapingJobRepository.findOne({
      where: { id: jobId, userId: userId },
    });
    if (!job) {
      this.logger.warn(`Scraping job ID ${jobId} not found for user ${userId}.`, 'ScrapingService');
      throw new NotFoundException(`Scraping Job with ID ${jobId} not found.`);
    }
    return job;
  }

  async updateScrapingJob(
    jobId: string,
    userId: string,
    updateScrapingJobDto: UpdateScrapingJobDto,
  ): Promise<ScrapingJob> {
    const job = await this.findOneScrapingJob(jobId, userId);

    // Stop existing schedule if cron is updated or removed
    if (job.scheduleCron && job.scheduleCron !== updateScrapingJobDto.scheduleCron) {
      this.schedulerService.stopScheduledJob(job.id);
      this.logger.log(`Stopped schedule for job ID: ${job.id}`, 'ScrapingService');
    }

    Object.assign(job, updateScrapingJobDto);

    // Re-evaluate job status based on schedule_cron
    if (job.scheduleCron) {
      job.status = ScrapingJobStatus.SCHEDULED;
      await this.schedulerService.scheduleJob(job); // Reschedule with new config
      this.logger.log(`Rescheduled job ID: ${job.id} with new cron: ${job.scheduleCron}`, 'ScrapingService');
    } else {
      // If schedule_cron is removed, set status to pending or completed if it was scheduled
      if (job.status === ScrapingJobStatus.SCHEDULED) {
        job.status = ScrapingJobStatus.PENDING; // Or update to a neutral status
      }
    }

    await this.scrapingJobRepository.save(job);
    this.logger.log(`Scraping job updated: ${job.name} (ID: ${job.id}) by user ${userId}`, 'ScrapingService');
    return job;
  }

  async deleteScrapingJob(jobId: string, userId: string): Promise<void> {
    const job = await this.findOneScrapingJob(jobId, userId); // Ensures user owns the job
    await this.scrapingJobRepository.delete(jobId);
    this.schedulerService.stopScheduledJob(job.id);
    this.logger.log(`Scraping job deleted: ${job.name} (ID: ${job.id}) by user ${userId}`, 'ScrapingService');
  }

  async enqueueScrapingTask(jobId: string, delayMs: number = 0): Promise<ScrapingTask> {
    const job = await this.scrapingJobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      this.logger.error(`Failed to enqueue task: Scraping job ID ${jobId} not found.`, 'ScrapingService');
      throw new NotFoundException(`Scraping Job with ID ${jobId} not found.`);
    }

    // Create a new task record in DB
    const newTask = this.scrapingTaskRepository.create({
      jobId: job.id,
      status: ScrapingTaskStatus.QUEUED,
    });
    await this.scrapingTaskRepository.save(newTask);
    this.logger.log(`Created new scraping task ID: ${newTask.id} for job ID: ${job.id}`, 'ScrapingService');

    // Add task to BullMQ queue
    await this.jobsService.addScrapingJob(
      newTask.id, // Use task ID as BullMQ job ID
      {
        jobId: job.id,
        taskId: newTask.id,
        targetUrl: job.targetUrl,
        config: job.config,
      },
      { delay: delayMs },
    );

    // Update the main job's status and last/next run times
    job.status = ScrapingJobStatus.RUNNING; // Or QUEUED
    job.lastRunAt = new Date();
    // If it's a scheduled job, nextRunAt should be updated by the scheduler
    await this.scrapingJobRepository.save(job);
    this.logger.log(`Scraping task ID: ${newTask.id} added to queue for job ID: ${job.id}`, 'ScrapingService');

    return newTask;
  }

  async getScrapingTasks(jobId: string, userId: string): Promise<ScrapingTask[]> {
    await this.findOneScrapingJob(jobId, userId); // Ensure job exists and belongs to user
    return this.scrapingTaskRepository.find({
      where: { jobId },
      order: { createdAt: 'DESC' },
    });
  }

  async getScrapingResults(taskId: string, userId: string): Promise<ScrapingResult[]> {
    const task = await this.scrapingTaskRepository.findOne({
      where: { id: taskId },
      relations: ['job'],
    });
    if (!task) {
      this.logger.warn(`Scraping task ID ${taskId} not found.`, 'ScrapingService');
      throw new NotFoundException(`Scraping Task with ID ${taskId} not found.`);
    }
    if (task.job.userId !== userId) {
      this.logger.warn(`User ${userId} attempted to access results for task ${taskId} not owned.`, 'ScrapingService');
      throw new BadRequestException('You do not have permission to view these results.');
    }
    return this.scrapingResultRepository.find({ where: { taskId } });
  }

  async getLatestScrapingResultsForJob(jobId: string, userId: string): Promise<ScrapingResult[]> {
    await this.findOneScrapingJob(jobId, userId); // Ensure job exists and belongs to user

    const latestTask = await this.scrapingTaskRepository
      .createQueryBuilder('task')
      .where('task.jobId = :jobId', { jobId })
      .orderBy('task.completedAt', 'DESC')
      .addOrderBy('task.startedAt', 'DESC')
      .addOrderBy('task.createdAt', 'DESC')
      .limit(1)
      .getOne();

    if (!latestTask) {
      return []; // No tasks found for this job
    }

    return this.scrapingResultRepository.find({ where: { taskId: latestTask.id } });
  }


  async handleScrapingTaskCompletion(
    taskId: string,
    status: ScrapingTaskStatus,
    results?: any[],
    errorMessage?: string,
  ): Promise<void> {
    const task = await this.scrapingTaskRepository.findOne({
      where: { id: taskId },
      relations: ['job'],
    });
    if (!task) {
      this.logger.error(`Scraping task ID ${taskId} not found during completion handling.`, 'ScrapingService');
      return;
    }

    task.status = status;
    task.completedAt = new Date();
    task.errorMessage = errorMessage || null;
    await this.scrapingTaskRepository.save(task);
    this.logger.log(`Scraping task ID: ${taskId} completed with status: ${status}`, 'ScrapingService');

    const job = task.job;
    job.status =
      status === ScrapingTaskStatus.COMPLETED
        ? ScrapingJobStatus.COMPLETED
        : ScrapingJobStatus.FAILED;
    await this.scrapingJobRepository.save(job);

    if (results && results.length > 0) {
      const resultEntities = results.map((data) =>
        this.scrapingResultRepository.create({
          taskId: task.id,
          jobId: job.id,
          data,
        }),
      );
      await this.scrapingResultRepository.save(resultEntities);
      this.logger.log(`${resultEntities.length} results saved for task ID: ${taskId}`, 'ScrapingService');
    }
  }

  async updateScrapingTaskStatus(taskId: string, status: ScrapingTaskStatus, errorMessage?: string) {
    await this.scrapingTaskRepository.update(
      { id: taskId },
      {
        status,
        startedAt: status === ScrapingTaskStatus.PROCESSING ? new Date() : undefined,
        completedAt:
          status === ScrapingTaskStatus.COMPLETED || status === ScrapingTaskStatus.FAILED
            ? new Date()
            : undefined,
        errorMessage: errorMessage || null,
      },
    );
    this.logger.debug(`Updated task ${taskId} status to ${status}`, 'ScrapingService');
  }

  async getScheduledJobs(): Promise<ScrapingJob[]> {
    return this.scrapingJobRepository.find({
      where: {
        status: ScrapingJobStatus.SCHEDULED,
        scheduleCron: expect.anything(), // Ensure scheduleCron is not null
      },
    });
  }

  async updateScrapingJobNextRun(jobId: string, nextRunAt: Date | null): Promise<void> {
    await this.scrapingJobRepository.update(jobId, { nextRunAt });
    this.logger.debug(`Updated job ${jobId} next run at: ${nextRunAt}`, 'ScrapingService');
  }
}
```