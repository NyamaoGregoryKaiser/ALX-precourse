```typescript
import { Request, Response, NextFunction } from 'express';
import { ScrapingTaskService } from '../services/ScrapingTaskService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import { z } from 'zod';
import { SelectorConfig } from '../entities/ScrapingTask'; // Import SelectorConfig type

/**
 * @file Scraping Task controller.
 *
 * This controller handles requests related to scraping tasks,
 * interacting with the `ScrapingTaskService` for CRUD operations
 * and initiating/stopping scraping.
 */

// Zod schema for SelectorConfig
const selectorConfigSchema = z.object({
  name: z.string().min(1, 'Selector name cannot be empty'),
  selector: z.string().min(1, 'Selector cannot be empty'),
  type: z.enum(['css', 'xpath']).default('css').optional(),
  attribute: z.string().min(1, 'Attribute cannot be empty').optional(),
});

// Zod schemas for validation
const createTaskSchema = z.object({
  projectId: z.string().uuid('Invalid project ID format'),
  targetUrl: z.string().url('Invalid URL format'),
  selectors: z.array(selectorConfigSchema).min(1, 'At least one selector is required'),
  scheduleInterval: z.string().optional().nullable(),
  headless: z.boolean().default(true).optional(),
});

const updateTaskSchema = z.object({
  targetUrl: z.string().url('Invalid URL format').optional(),
  selectors: z.array(selectorConfigSchema).min(1, 'At least one selector is required').optional(),
  scheduleInterval: z.string().optional().nullable(),
  headless: z.boolean().optional(),
  status: z.enum(['pending', 'running', 'completed', 'failed', 'cancelled']).optional(),
});

export class ScrapingTaskController {
  constructor(private scrapingTaskService: ScrapingTaskService) {}

  /**
   * Creates a new scraping task.
   * @route POST /api/tasks
   * @param {Request} req - The Express request object with task data in body.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async createTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const taskData = createTaskSchema.parse(req.body);
      const userId = req.user!.id;
      const newTask = await this.scrapingTaskService.createTask(userId, taskData);
      logger.info(`Scraping task created for project ${taskData.projectId} by user ${userId}`);
      res.status(201).json({ status: 'success', message: 'Scraping task created successfully', data: newTask });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      logger.error(`Error creating scraping task for user ${req.user!.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Gets all scraping tasks for a project (or all for admin).
   * @route GET /api/projects/:projectId/tasks
   * @param {Request} req - The Express request object with project ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getAllTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';
      const tasks = await this.scrapingTaskService.findAllTasks(projectId, userId, isAdmin);
      logger.info(`Fetched ${tasks.length} tasks for project ${projectId} by user ${userId}.`);
      res.status(200).json({ status: 'success', data: tasks });
    } catch (error: any) {
      logger.error(`Error fetching all tasks for project ${req.params.projectId}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Gets a specific scraping task by ID.
   * @route GET /api/tasks/:id
   * @param {Request} req - The Express request object with task ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getTaskById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const task = await this.scrapingTaskService.findTaskById(id, userId, isAdmin);
      if (!task) {
        return next(new AppError('Scraping task not found or you do not have permission to view it', 404));
      }
      logger.info(`Fetched scraping task ${id} for user ${userId}.`);
      res.status(200).json({ status: 'success', data: task });
    } catch (error: any) {
      logger.error(`Error fetching task by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Updates a scraping task by ID.
   * @route PUT /api/tasks/:id
   * @param {Request} req - The Express request object with task ID in params and update data in body.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async updateTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = updateTaskSchema.parse(req.body);
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const updatedTask = await this.scrapingTaskService.updateTask(id, userId, isAdmin, updateData);
      if (!updatedTask) {
        return next(new AppError('Scraping task not found or you do not have permission to update it', 404));
      }
      logger.info(`Scraping task ${id} updated by user ${userId}.`);
      res.status(200).json({ status: 'success', message: 'Scraping task updated successfully', data: updatedTask });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return next(new AppError('Validation error: ' + error.errors.map(e => e.message).join(', '), 400));
      }
      logger.error(`Error updating task by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Deletes a scraping task by ID.
   * @route DELETE /api/tasks/:id
   * @param {Request} req - The Express request object with task ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async deleteTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const deleted = await this.scrapingTaskService.deleteTask(id, userId, isAdmin);
      if (!deleted) {
        return next(new AppError('Scraping task not found or you do not have permission to delete it', 404));
      }
      logger.info(`Scraping task ${id} deleted by user ${userId}.`);
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error: any) {
      logger.error(`Error deleting task by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Initiates a scraping task immediately.
   * @route POST /api/tasks/:id/scrape
   * @param {Request} req - The Express request object with task ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async scrapeTask(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const result = await this.scrapingTaskService.initiateScraping(id, userId, isAdmin);
      logger.info(`Scraping initiated for task ${id} by user ${userId}. Result ID: ${result.id}`);
      res.status(200).json({ status: 'success', message: 'Scraping task initiated', data: result });
    } catch (error: any) {
      logger.error(`Error initiating scraping for task ${req.params.id}: ${error.message}`);
      next(error);
    }
  }
}
```