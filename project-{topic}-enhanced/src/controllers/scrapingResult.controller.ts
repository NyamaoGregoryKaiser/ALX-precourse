```typescript
import { Request, Response, NextFunction } from 'express';
import { ScrapingResultService } from '../services/ScrapingResultService';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';

/**
 * @file Scraping Result controller.
 *
 * This controller handles requests related to viewing scraping results,
 * interacting with the `ScrapingResultService`.
 */

export class ScrapingResultController {
  constructor(private scrapingResultService: ScrapingResultService) {}

  /**
   * Gets all scraping results for a specific task.
   * @route GET /api/tasks/:taskId/results
   * @param {Request} req - The Express request object with task ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getResultsByTaskId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { taskId } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const results = await this.scrapingResultService.findResultsByTaskId(taskId, userId, isAdmin);
      logger.info(`Fetched ${results.length} results for task ${taskId} by user ${userId}.`);
      res.status(200).json({ status: 'success', data: results });
    } catch (error: any) {
      logger.error(`Error fetching results for task ${req.params.taskId}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Gets a specific scraping result by its ID.
   * @route GET /api/results/:id
   * @param {Request} req - The Express request object with result ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async getResultById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const result = await this.scrapingResultService.findResultById(id, userId, isAdmin);
      if (!result) {
        return next(new AppError('Scraping result not found or you do not have permission to view it', 404));
      }
      logger.info(`Fetched scraping result ${id} for user ${userId}.`);
      res.status(200).json({ status: 'success', data: result });
    } catch (error: any) {
      logger.error(`Error fetching result by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }

  /**
   * Deletes a specific scraping result by its ID.
   * @route DELETE /api/results/:id
   * @param {Request} req - The Express request object with result ID in params.
   * @param {Response} res - The Express response object.
   * @param {NextFunction} next - The next middleware function.
   */
  async deleteResult(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const isAdmin = req.user!.role === 'admin';

      const deleted = await this.scrapingResultService.deleteResult(id, userId, isAdmin);
      if (!deleted) {
        return next(new AppError('Scraping result not found or you do not have permission to delete it', 404));
      }
      logger.info(`Scraping result ${id} deleted by user ${userId}.`);
      res.status(204).send(); // 204 No Content for successful deletion
    } catch (error: any) {
      logger.error(`Error deleting result by ID ${req.params.id}: ${error.message}`);
      next(error);
    }
  }
}
```