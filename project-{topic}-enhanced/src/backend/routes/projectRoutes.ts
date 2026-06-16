import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';
import { ProjectService } from '../services/ProjectService';
import { AppDataSource } from '../database/data-source';
import { authenticate, isOwner } from '../middleware/authMiddleware';
import { validate } from '../utils/validation';
import { createProjectSchema, updateProjectSchema } from '../utils/validation';
import { CacheService, redisClient } from '../services/CacheService';
import { logger } from '../utils/logger';

const router = Router();
const projectService = new ProjectService(AppDataSource.getRepository('Project'));
const cacheService = new CacheService(); // Instantiate CacheService
const projectController = new ProjectController(projectService, cacheService);

// Middleware for caching projects list
const cacheProjectsList = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return next(); // Should not happen with `authenticate` before this

    const cacheKey = CacheService.generateUserCacheKey(req.user.id, 'projects');
    try {
        const cachedProjects = await cacheService.get(cacheKey);
        if (cachedProjects) {
            logger.debug(`Serving projects from cache for user ${req.user.id}`);
            return res.status(200).json(cachedProjects);
        }
        next(); // Proceed to controller if not in cache
    } catch (error) {
        logger.error(`Error retrieving projects from cache: ${error}`);
        next(); // Continue without cache if error
    }
};

// Routes
router.post('/', authenticate, validate(createProjectSchema), projectController.createProject);
router.get('/', authenticate, cacheProjectsList, projectController.getProjects);
router.get('/:projectId', authenticate, isOwner, projectController.getProjectById);
router.put('/:projectId', authenticate, isOwner, validate(updateProjectSchema), projectController.updateProject);
router.delete('/:projectId', authenticate, isOwner, projectController.deleteProject);

export default router;