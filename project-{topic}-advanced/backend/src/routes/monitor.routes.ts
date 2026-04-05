```typescript
import { Router } from 'express';
import { AppDataSource } from '../database/data-source';
import { MonitorService } from '../services/monitor.service';
import { MonitorRepository } from '../repositories/Monitor.repository';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate, idSchema } from '../middleware/validation.middleware';
import { MonitorMethod, MonitorStatus } from '../entities/Monitor.entity';
import Joi from 'joi';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/api-error';
import { checkMonitor } from '../jobs/monitor-scheduler';
import { AppDataSource as DataSourceConfig } from '../database/data-source';
import { Monitor } from '../entities/Monitor.entity';
import logger from '../utils/logger';
import { cacheMiddleware } from '../services/cache.service';

const router = Router();
const monitorRepository = new MonitorRepository(AppDataSource.getRepository(Monitor));
const monitorService = new MonitorService(monitorRepository);

// Schemas for validation
const createMonitorSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  url: Joi.string().uri().required(),
  method: Joi.string().valid(...Object.values(MonitorMethod)).default(MonitorMethod.GET),
  intervalSeconds: Joi.number().integer().min(10).max(3600).default(60), // 10s to 1h
  status: Joi.string().valid(...Object.values(MonitorStatus)).default(MonitorStatus.ACTIVE),
  projectId: Joi.string().uuid().required(),
});

const updateMonitorSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  url: Joi.string().uri().optional(),
  method: Joi.string().valid(...Object.values(MonitorMethod)).optional(),
  intervalSeconds: Joi.number().integer().min(10).max(3600).optional(),
  status: Joi.string().valid(...Object.values(MonitorStatus)).optional(),
  projectId: Joi.string().uuid().optional(), // Can move monitor to another project
});

// Middleware to check monitor ownership
const checkMonitorOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const { projectId } = req.body.projectId ? req.body : req.query; // For POST or GET requests
  const monitor = await monitorService.getMonitorById(id, req.user!.id);

  if (!monitor) {
    return next(new ApiError(StatusCodes.NOT_FOUND, 'Monitor not found or you do not have access.'));
  }
  // Ensure the monitor found belongs to a project owned by the user
  if (monitor.project.userId !== req.user!.id) {
    return next(new ApiError(StatusCodes.FORBIDDEN, 'You do not have permission to access this monitor.'));
  }
  // If projectId is provided in the body for update, ensure it's also owned by the user
  if (req.body.projectId && req.body.projectId !== monitor.projectId) {
    const newProject = await monitorService.checkProjectOwnership(req.body.projectId, req.user!.id);
    if (!newProject) {
        return next(new ApiError(StatusCodes.FORBIDDEN, 'New project not found or you do not have access.'));
    }
  }
  next();
};

router.use(authenticate); // All monitor routes require authentication

// Get all monitors for a user (across all their projects)
router.get('/', cacheMiddleware('monitors'), async (req: AuthRequest, res, next) => {
  try {
    const monitors = await monitorService.getAllMonitorsByUserId(req.user!.id);
    res.status(StatusCodes.OK).json(monitors);
  } catch (error) {
    next(error);
  }
});

// Get a specific monitor by ID
router.get('/:id', validate(idSchema, 'params'), checkMonitorOwnership, cacheMiddleware('monitorById'), async (req: AuthRequest, res, next) => {
  try {
    const monitor = await monitorService.getMonitorById(req.params.id, req.user!.id);
    res.status(StatusCodes.OK).json(monitor);
  } catch (error) {
    next(error);
  }
});

// Create a new monitor
router.post('/', validate(createMonitorSchema), async (req: AuthRequest, res, next) => {
  try {
    // Ensure the project exists and belongs to the user
    const project = await monitorService.checkProjectOwnership(req.body.projectId, req.user!.id);
    if (!project) {
      return next(new ApiError(StatusCodes.BAD_REQUEST, 'Project not found or does not belong to you.'));
    }

    const monitor = await monitorService.createMonitor(req.body, req.user!.id);
    res.status(StatusCodes.CREATED).json(monitor);
  } catch (error) {
    next(error);
  }
});

// Update a monitor
router.put('/:id', validate(idSchema, 'params'), validate(updateMonitorSchema), checkMonitorOwnership, async (req: AuthRequest, res, next) => {
  try {
    const updatedMonitor = await monitorService.updateMonitor(req.params.id, req.body, req.user!.id);
    res.status(StatusCodes.OK).json(updatedMonitor);
  } catch (error) {
    next(error);
  }
});

// Delete a monitor
router.delete('/:id', validate(idSchema, 'params'), checkMonitorOwnership, async (req: AuthRequest, res, next) => {
  try {
    await monitorService.deleteMonitor(req.params.id, req.user!.id);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
});

// Manually trigger a monitor check (for testing/immediate results)
router.post('/:id/check', validate(idSchema, 'params'), checkMonitorOwnership, async (req: AuthRequest, res, next) => {
  try {
    const monitor = await monitorService.getMonitorById(req.params.id, req.user!.id);
    if (!monitor) {
      return next(new ApiError(StatusCodes.NOT_FOUND, 'Monitor not found.'));
    }
    await checkMonitor(monitor); // Use the existing job function
    res.status(StatusCodes.OK).json({ message: `Monitor '${monitor.name}' check triggered successfully.` });
  } catch (error) {
    logger.error(`Error triggering manual monitor check for ${req.params.id}:`, error);
    next(new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Failed to trigger manual check.'));
  }
});

export default router;
```