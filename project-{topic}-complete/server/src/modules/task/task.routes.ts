import { Router } from 'express';
import * as taskController from './task.controller';
import { authMiddleware, authorizeRoles } from '../../middlewares/auth.middleware';
import { apiRateLimiter } from '../../middlewares/rateLimit.middleware';
import { cacheMiddleware } from '../../middlewares/cache.middleware';
import config from '../../config';

const router = Router();

// Apply rate limiting to all task routes
router.use(apiRateLimiter);

// All task routes require authentication
router.use(authMiddleware);

router.post('/', taskController.createTask);
router.get('/', cacheMiddleware({ keyPrefix: 'tasks', ttlSeconds: config.cacheTtlTasks }), taskController.getTasks);
router.get('/:id', cacheMiddleware({ keyPrefix: 'task', ttlSeconds: config.cacheTtlTasks }), taskController.getTaskById);
router.patch('/:id', taskController.updateTask); // Reporter, Assignee or Admin can update
router.delete('/:id', taskController.deleteTask); // Reporter or Admin can delete

export default router;