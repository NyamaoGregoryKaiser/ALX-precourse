```typescript
import { Repository } from 'typeorm';
import { ScrapingResult } from '../entities/ScrapingResult';
import { ScrapingTask } from '../entities/ScrapingTask';
import { Project } from '../entities/Project';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { CacheService } from './CacheService';

/**
 * @file Scraping Result service.
 *
 * Manages the storage, retrieval, and deletion of scraping results.
 * It ensures proper authorization checks before exposing data.
 */

export class ScrapingResultService {
  constructor(
    private scrapingResultRepository: Repository<ScrapingResult>,
    private scrapingTaskRepository: Repository<ScrapingTask>, // To verify task existence/ownership
    private projectRepository: Repository<Project>, // To verify project existence/ownership
    private cacheService: CacheService
  ) {}

  /**
   * Creates and stores a new scraping result.
   * @param {ScrapingTask} task - The scraping task associated with this result.
   * @param {Record<string, any>} data - The actual scraped data.
   * @param {'success' | 'failed'} status - The status of the scraping operation.
   * @param {string | null} errorMessage - Any error message if the scraping failed.
   * @returns {Promise<ScrapingResult>} The newly created scraping result.
   */
  async createResult(
    task: ScrapingTask,
    data: Record<string, any>,
    status: 'success' | 'failed',
    errorMessage: string | null = null
  ): Promise<ScrapingResult> {
    const newResult = this.scrapingResultRepository.create({
      task: task,
      project: task.project, // Link result directly to project for easier querying
      data: data,
      status: status,
      errorMessage: errorMessage,
    });
    const savedResult = await this.scrapingResultRepository.save(newResult);

    // Invalidate caches related to this task's results
    this.cacheService.del(`task:${task.id}:results`);
    this.cacheService.del(`project:${task.project.id}:results`); // Could be useful for project-level result views
    logger.info(`Scraping result ${savedResult.id} saved for task ${task.id}.`);
    return savedResult;
  }

  /**
   * Retrieves all results for a specific scraping task, with authorization check.
   * @param {string} taskId - The ID of the task to get results for.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<ScrapingResult[]>} A list of scraping results.
   * @throws {AppError} If task not found or unauthorized.
   */
  async findResultsByTaskId(taskId: string, userId: string, isAdmin: boolean): Promise<ScrapingResult[]> {
    // First, verify the task exists and the user is authorized to access it
    const task = await this.scrapingTaskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'project.user'],
      select: {
        id: true,
        project: { id: true, user: { id: true } }
      }
    });

    if (!task) {
      logger.warn(`Attempt to retrieve results for non-existent task ${taskId} by user ${userId}.`);
      throw new AppError('Scraping task not found', 404);
    }

    if (!isAdmin && task.project.user.id !== userId) {
      logger.warn(`Unauthorized attempt to retrieve results for task ${taskId} by user ${userId}.`);
      throw new AppError('Forbidden: You do not have permission to view results for this task', 403);
    }

    const cacheKey = `task:${taskId}:results`;
    const cachedResults = this.cacheService.get<ScrapingResult[]>(cacheKey);
    if (cachedResults) {
      logger.debug(`Fetching results for task ${taskId} from cache.`);
      return cachedResults;
    }

    const results = await this.scrapingResultRepository.find({
      where: { task: { id: taskId } },
      order: { scrapedAt: 'DESC' },
      select: {
        id: true, data: true, status: true, errorMessage: true, scrapedAt: true,
        task: { id: true }, // Include minimal task info for context
        project: { id: true } // Include minimal project info for context
      }
    });

    this.cacheService.set(cacheKey, results);
    logger.debug(`Fetched results for task ${taskId} from DB and cached.`);
    return results;
  }

  /**
   * Finds a specific scraping result by its ID, with authorization check.
   * @param {string} resultId - The ID of the result to find.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<ScrapingResult | null>} The result or null if not found/unauthorized.
   */
  async findResultById(resultId: string, userId: string, isAdmin: boolean): Promise<ScrapingResult | null> {
    const cacheKey = `result:${resultId}`;
    const cachedResult = this.cacheService.get<ScrapingResult>(cacheKey);
    if (cachedResult) {
      // Check authorization for cached result via its project owner
      const project = await this.projectRepository.findOne({
        where: { id: cachedResult.project.id },
        relations: ['user'],
        select: { id: true, user: { id: true } }
      });
      if (project && (isAdmin || project.user.id === userId)) {
        logger.debug(`Fetching result ${resultId} from cache (authorized).`);
        return cachedResult;
      }
      logger.warn(`Unauthorized access attempt to cached result ${resultId} by user ${userId}.`);
      return null;
    }

    const result = await this.scrapingResultRepository.findOne({
      where: { id: resultId },
      relations: ['task', 'task.project', 'task.project.user'], // Load full path for authorization
      select: {
        id: true, data: true, status: true, errorMessage: true, scrapedAt: true,
        task: { id: true },
        project: { id: true, user: { id: true } } // Select user ID for auth
      }
    });

    if (!result) {
      logger.warn(`Scraping result ${resultId} not found.`);
      return null;
    }

    if (!isAdmin && result.project.user.id !== userId) {
      logger.warn(`Unauthorized attempt to view result ${resultId} by user ${userId}.`);
      return null;
    }

    this.cacheService.set(cacheKey, result);
    logger.debug(`Fetched result ${resultId} from DB and cached.`);
    return result;
  }

  /**
   * Deletes a specific scraping result by its ID, with authorization check.
   * @param {string} resultId - The ID of the result to delete.
   * @param {string} userId - The ID of the authenticated user.
   * @param {boolean} isAdmin - True if the user is an admin.
   * @returns {Promise<boolean>} True if the result was deleted, false otherwise.
   */
  async deleteResult(resultId: string, userId: string, isAdmin: boolean): Promise<boolean> {
    const resultToDelete = await this.scrapingResultRepository.findOne({
      where: { id: resultId },
      relations: ['task', 'task.project', 'task.project.user'], // Load full path for authorization
    });

    if (!resultToDelete) {
      logger.warn(`Scraping result ${resultId} not found for deletion.`);
      return false;
    }

    if (!isAdmin && resultToDelete.task.project.user.id !== userId) {
      logger.warn(`Unauthorized attempt to delete result ${resultId} by user ${userId}.`);
      return false;
    }

    const deleteResult = await this.scrapingResultRepository.delete(resultId);
    if (deleteResult.affected && deleteResult.affected > 0) {
      // Invalidate relevant caches
      this.cacheService.del(`result:${resultId}`);
      this.cacheService.del(`task:${resultToDelete.task.id}:results`);
      this.cacheService.del(`project:${resultToDelete.project.id}:results`);
      logger.info(`Scraping result ${resultId} deleted by user ${userId}. Caches invalidated.`);
      return true;
    }
    return false;
  }
}
```