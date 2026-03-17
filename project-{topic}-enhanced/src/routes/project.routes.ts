```typescript
import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { ProjectService } from '../services/ProjectService';
import { AppDataSource } from '../config/database';
import { Project } from '../entities/Project';
import { User } from '../entities/User';
import { authenticateToken } from '../middleware/auth.middleware';
import { CacheService } from '../services/CacheService';
import { appCache } from '../config/cache';

/**
 * @file Project management routes.
 *
 * Defines the API endpoints for managing scraping projects.
 * These routes require authentication.
 */

const router = Router();
const projectRepository = AppDataSource.getRepository(Project);
const userRepository = AppDataSource.getRepository(User);
const cacheService = new CacheService(appCache); // Shared cache service instance

const projectService = new ProjectService(projectRepository, userRepository, cacheService);
const projectController = new ProjectController(projectService);

// Apply authentication middleware to all project routes
router.use(authenticateToken);

router.post('/', (req, res, next) => projectController.createProject(req, res, next));
router.get('/', (req, res, next) => projectController.getAllProjects(req, res, next));
router.get('/:id', (req, res, next) => projectController.getProjectById(req, res, next));
router.put('/:id', (req, res, next) => projectController.updateProject(req, res, next));
router.delete('/:id', (req, res, next) => projectController.deleteProject(req, res, next));

export default router;
```