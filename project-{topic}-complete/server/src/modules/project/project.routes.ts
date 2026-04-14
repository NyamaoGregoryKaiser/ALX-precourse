import { Router } from 'express';
import * as projectController from './project.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth.middleware';
import { apiRateLimiter } from '../../middlewares/rateLimit.middleware';
import { cacheMiddleware } from '../../middlewares/cache.middleware';
import config from '../../config';

const router = Router();

// Apply rate limiting to all project routes
router.use(apiRateLimiter);

// All project routes require authentication
router.use(authMiddleware);

router.post('/', projectController.createProject); // Any authenticated user can create a project
router.get('/', cacheMiddleware({ keyPrefix: 'projects', ttlSeconds: config.cacheTtlProjects }), projectController.getProjects);
router.get('/:id', cacheMiddleware({ keyPrefix: 'project', ttlSeconds: config.cacheTtlProjects }), projectController.getProjectById);
router.patch('/:id', projectController.updateProject); // Only project owner or admin can update
router.delete('/:id', projectController.deleteProject); // Only project owner or admin can delete

export default router;