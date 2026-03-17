```typescript
import { Router } from 'express';
import { ScrapingResultController } from '../controllers/scrapingResult.controller';
import { ScrapingResultService } from '../services/ScrapingResultService';
import { AppDataSource } from '../config/database';
import { ScrapingResult } from '../entities/ScrapingResult';
import { ScrapingTask } from '../entities/ScrapingTask';
import { Project } from '../entities/Project';
import { authenticateToken } from '../middleware/auth.middleware';
import { CacheService } from '../services/CacheService';
import { appCache } from '../config/cache';

/**
 * @file Scraping Result routes.
 *
 * Defines the API endpoints for retrieving and managing scraping results.
 * These routes require authentication.
 */

const router = Router();
const scrapingResultRepository = AppDataSource.getRepository(ScrapingResult);
const scrapingTaskRepository = AppDataSource.getRepository(ScrapingTask);
const projectRepository = AppDataSource.getRepository(Project);

const cacheService = new CacheService(appCache);

const scrapingResultService = new ScrapingResultService(
  scrapingResultRepository,
  scrapingTaskRepository,
  projectRepository,
  cacheService
);
const scrapingResultController = new ScrapingResultController(scrapingResultService);

// Apply authentication middleware to all scraping result routes
router.use(authenticateToken);

router.get('/task/:taskId', (req, res, next) => scrapingResultController.getResultsByTaskId(req, res, next));
router.get('/:id', (req, res, next) => scrapingResultController.getResultById(req, res, next));
router.delete('/:id', (req, res, next) => scrapingResultController.deleteResult(req, res, next));

export default router;
```