```typescript
import { Repository } from 'typeorm';
import { ScrapingTask, SelectorConfig } from '../entities/ScrapingTask';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { ProjectService } from './ProjectService';
import { ScraperService } from './ScraperService';
import { ScrapingResultService } from './ScrapingResultService';
import { CacheService } from './CacheService';

/**
 * @file Scraping Task service.
 *
 * Manages the lifecycle of scraping tasks, including CRUD operations,
 * scheduling (basic), and delegating actual scraping to `ScraperService`.
 * It also handles storing results via `ScrapingResultService`.
 */

interface CreateTaskData {
  projectId: string;
  targetUrl: string;
  selectors: SelectorConfig[];
  scheduleInterval?: string | null;
  headless?: boolean;
}

interface UpdateTaskData {
  targetUrl?: string;
  selectors?: SelectorConfig[];
  scheduleInterval?: string | null;
  headless?: boolean;
  status?: "pending" | "running" | "completed" | "failed" | "cancelled";
}

export class ScrapingTaskService {
  constructor(
    private scrapingTaskRepository: Repository<ScrapingTask>,
    private projectService: ProjectService, // Dependency on ProjectService for authorization
    private scraperService: ScraperService, // Dependency on ScraperService for actual scraping
    private scrapingResultService: ScrapingResultService, // Dependency on ScrapingResultService for saving results
    private cacheService: CacheService
  ) {}

  /**
   * Creates a new scraping task.
   * @param {string} userId - The ID of the user creating the task.
   * @param {CreateTaskData} taskData - Data for the new task.
   * @returns {Promise<ScrapingTask>} The newly created task.
   * @throws {AppError} If project not found or unauthorized.
   */
  async createTask(userId: string, taskData: CreateTaskData): Promise<ScrapingTask> {
    const { projectId, targetUrl, selectors, scheduleInterval, headless } = taskData;

    // Verify project existence and user authorization
    const project = await this.projectService.findProjectById(projectId, userId, false); // User cannot be admin here for project ownership check
    if (!project) {
      logger.error(`Attempted to create task for project ${projectId} by user ${userId} but project not found or unauthorized.`);
      throw new AppError('Project not found or you do not have permission to create tasks in it', 404);
    }

    const newTask = this.scrapingTaskRepository.create({
      project: project,
      targetUrl,
      selectors,
      scheduleInterval: scheduleInterval || null,
      headless: headless ?? true,
      status: 'pending',
    });

    const savedTask = await this.scrapingTaskRepository.save(newTask);

    this.cacheService.del(`project:${projectId}:tasks`); // Invalidate project's tasks cache
    this.cacheService.del(`task:${savedTask.id}`); // Invalidate specific task cache
    logger.info(`Scraping task ${savedTask.id} created for project ${projectId} by user ${userId}.`);
    return savedTask;
  }

  /**
   * Retrieves all tasks for a given project, with authorization check.
   * @param {string} projectId - The ID of the project.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<ScrapingTask[]>} A list of scraping tasks.
   */
  async findAllTasks(projectId: string, userId: string, isAdmin: boolean): Promise<ScrapingTask[]> {
    // Check project authorization first
    const project = await this.projectService.findProjectById(projectId, userId, isAdmin);
    if (!project) {
      logger.warn(`Unauthorized attempt to list tasks for project ${projectId} by user ${userId}.`);
      throw new AppError('Project not found or you do not have permission to view its tasks', 404);
    }

    const cacheKey = `project:${projectId}:tasks`;
    const cachedTasks = this.cacheService.get<ScrapingTask[]>(cacheKey);
    if (cachedTasks) {
      logger.debug(`Fetching tasks for project ${projectId} from cache.`);
      return cachedTasks;
    }

    const tasks = await this.scrapingTaskRepository.find({
      where: { project: { id: projectId } },
      relations: ['project'],
      order: { createdAt: 'DESC' },
      select: {
        id: true, targetUrl: true, selectors: true, status: true,
        scheduleInterval: true, lastRunAt: true, nextRunAt: true, headless: true,
        createdAt: true, updatedAt: true,
        project: { id: true, name: true }
      }
    });

    this.cacheService.set(cacheKey, tasks);
    logger.debug(`Fetched tasks for project ${projectId} from DB and cached.`);
    return tasks;
  }

  /**
   * Finds a specific scraping task by its ID, with authorization check.
   * @param {string} taskId - The ID of the task to find.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<ScrapingTask | null>} The task or null if not found/unauthorized.
   */
  async findTaskById(taskId: string, userId: string, isAdmin: boolean): Promise<ScrapingTask | null> {
    const cacheKey = `task:${taskId}`;
    const cachedTask = this.cacheService.get<ScrapingTask>(cacheKey);
    if (cachedTask) {
      // Check project authorization for cached task
      const project = await this.projectService.findProjectById(cachedTask.project.id, userId, isAdmin);
      if (project) {
        logger.debug(`Fetching task ${taskId} from cache (authorized).`);
        return cachedTask;
      }
      logger.warn(`Unauthorized access attempt to cached task ${taskId} by user ${userId}.`);
      return null; // Unauthorized
    }

    const task = await this.scrapingTaskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'project.user'], // Load project and its user for authorization
      select: {
        id: true, targetUrl: true, selectors: true, status: true,
        scheduleInterval: true, lastRunAt: true, nextRunAt: true, headless: true,
        createdAt: true, updatedAt: true,
        project: { id: true, name: true, user: { id: true } } // Select user ID for auth
      }
    });

    if (!task) {
      logger.warn(`Scraping task ${taskId} not found.`);
      return null;
    }

    // Check if the user is authorized to view this task
    if (!isAdmin && task.project.user.id !== userId) {
      logger.warn(`Unauthorized attempt to view task ${taskId} by user ${userId}.`);
      return null; // Not authorized
    }

    this.cacheService.set(cacheKey, task);
    logger.debug(`Fetched task ${taskId} from DB and cached.`);
    return task;
  }

  /**
   * Updates an existing scraping task, with authorization check.
   * @param {string} taskId - The ID of the task to update.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @param {UpdateTaskData} updateData - Data to update the task with.
   * @returns {Promise<ScrapingTask | null>} The updated task or null if not found/unauthorized.
   */
  async updateTask(
    taskId: string,
    userId: string,
    isAdmin: boolean,
    updateData: UpdateTaskData
  ): Promise<ScrapingTask | null> {
    const task = await this.scrapingTaskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'project.user'],
    });

    if (!task) {
      logger.warn(`Scraping task ${taskId} not found for update.`);
      return null;
    }

    if (!isAdmin && task.project.user.id !== userId) {
      logger.warn(`Unauthorized attempt to update task ${taskId} by user ${userId}.`);
      return null; // Not authorized
    }

    Object.assign(task, updateData);
    const updatedTask = await this.scrapingTaskRepository.save(task);

    // Invalidate relevant caches
    this.cacheService.del(`task:${taskId}`);
    this.cacheService.del(`project:${task.project.id}:tasks`);
    logger.info(`Scraping task ${taskId} updated by user ${userId}. Caches invalidated.`);
    return updatedTask;
  }

  /**
   * Deletes a scraping task, with authorization check.
   * @param {string} taskId - The ID of the task to delete.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<boolean>} True if the task was deleted, false otherwise.
   */
  async deleteTask(taskId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const task = await this.scrapingTaskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'project.user'],
    });

    if (!task) {
      logger.warn(`Scraping task ${taskId} not found for deletion.`);
      return false;
    }

    if (!isAdmin && task.project.user.id !== userId) {
      logger.warn(`Unauthorized attempt to delete task ${taskId} by user ${userId}.`);
      return false; // Not authorized
    }

    const result = await this.scrapingTaskRepository.delete(taskId);
    if (result.affected && result.affected > 0) {
      // Invalidate relevant caches
      this.cacheService.del(`task:${taskId}`);
      this.cacheService.del(`project:${task.project.id}:tasks`);
      // Also invalidate results for this task
      this.cacheService.del(`task:${taskId}:results`);
      logger.info(`Scraping task ${taskId} deleted by user ${userId}. Caches invalidated.`);
      return true;
    }
    return false;
  }

  /**
   * Initiates a scraping process for a given task immediately.
   * @param {string} taskId - The ID of the task to scrape.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<any>} The created scraping result.
   * @throws {AppError} If task not found, unauthorized, or scraping fails.
   */
  async initiateScraping(taskId: string, userId: string, isAdmin: boolean): Promise<any> {
    const task = await this.findTaskById(taskId, userId, isAdmin); // Reuses auth check
    if (!task) {
      throw new AppError('Scraping task not found or unauthorized to initiate', 404);
    }

    if (task.status === 'running') {
      throw new AppError('Scraping task is already running', 409);
    }

    let scrapedData: Record<string, any> | null = null;
    let scrapeStatus: "success" | "failed" = "failed";
    let errorMessage: string | null = null;

    // Update task status to running
    task.status = 'running';
    task.lastRunAt = new Date();
    await this.scrapingTaskRepository.save(task);
    this.cacheService.del(`task:${taskId}`); // Invalidate cache for updated task

    logger.info(`Starting scrape for task ${taskId} (URL: ${task.targetUrl})`);

    try {
      scrapedData = await this.scraperService.scrape(task.targetUrl, task.selectors, task.headless);
      scrapeStatus = 'success';
      logger.info(`Scraping task ${taskId} completed successfully.`);
    } catch (error: any) {
      errorMessage = error.message || 'Unknown scraping error';
      logger.error(`Scraping task ${taskId} failed: ${errorMessage}`);
    } finally {
      // Update task status after completion/failure
      task.status = scrapeStatus === 'success' ? 'completed' : 'failed';
      // Recalculate next run if scheduled, otherwise leave null for manual tasks
      // (Advanced: Integrate a proper scheduler like 'node-cron' or a queue for this)
      task.nextRunAt = null; // For simplicity, manual run doesn't set a future schedule
      await this.scrapingTaskRepository.save(task);
      this.cacheService.del(`task:${taskId}`); // Invalidate cache again for final status

      // Save the scraping result
      const result = await this.scrapingResultService.createResult(
        task,
        scrapedData || {},
        scrapeStatus,
        errorMessage
      );
      return result;
    }
  }

  // Future improvement: Implement scheduled task execution using a cron library
  // or a message queue system (e.g., RabbitMQ, Redis BullMQ)
  // private setupScheduler() { ... }
}
```