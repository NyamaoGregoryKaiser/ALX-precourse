```typescript
import { Router, NextFunction, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { MetricService } from '../services/metric.service';
import { MetricRepository } from '../repositories/Metric.repository';
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate, idSchema, paginationSchema } from '../middleware/validation.middleware';
import Joi from 'joi';
import { Monitor } from '../entities/Monitor.entity';
import { MonitorRepository } from '../repositories/Monitor.repository';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/api-error';
import { cacheMiddleware } from '../services/cache.service';

const router = Router();
const metricRepository = new MetricRepository(AppDataSource.getRepository(Metric));
const monitorRepository = new MonitorRepository(AppDataSource.getRepository(Monitor)); // Needed for ownership check
const metricService = new MetricService(metricRepository, monitorRepository);

// Schema for metric query parameters
const metricQuerySchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(50),
  offset: Joi.number().integer().min(0).default(0),
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
}).concat(paginationSchema);

// Schema for metric summary query parameters
const metricSummaryQuerySchema = Joi.object({
  interval: Joi.string().valid('24h', '7d', '30d', '3m', '6m', '1y').default('24h'), // e.g., 24 hours, 7 days, 3 months
});

// Middleware to check monitor ownership before accessing its metrics
const checkMonitorOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { monitorId } = req.params;
  const monitor = await monitorRepository.findOne({
    where: { id: monitorId },
    relations: ['project'],
  });

  if (!monitor || monitor.project.userId !== req.user!.id) {
    return next(new ApiError(StatusCodes.NOT_FOUND, 'Monitor not found or you do not have access.'));
  }
  next();
};

router.use(authenticate); // All metric routes require authentication

// Get metrics for a specific monitor
router.get('/monitors/:monitorId', validate(idSchema, 'params'), validate(metricQuerySchema, 'query'), checkMonitorOwnership, cacheMiddleware('monitorMetrics'), async (req: AuthRequest, res, next) => {
  try {
    const { monitorId } = req.params;
    const { limit, offset, startDate, endDate } = req.query as { limit?: number; offset?: number; startDate?: string; endDate?: string; };

    const metrics = await metricService.getMetricsByMonitorId(
      monitorId,
      limit,
      offset,
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined
    );
    res.status(StatusCodes.OK).json(metrics);
  } catch (error) {
    next(error);
  }
});

// Get summary metrics for a specific monitor
router.get('/monitors/:monitorId/summary', validate(idSchema, 'params'), validate(metricSummaryQuerySchema, 'query'), checkMonitorOwnership, cacheMiddleware('monitorMetricsSummary'), async (req: AuthRequest, res, next) => {
  try {
    const { monitorId } = req.params;
    const { interval } = req.query as { interval?: string };

    const summary = await metricService.getMonitorSummary(monitorId, interval);
    res.status(StatusCodes.OK).json(summary);
  } catch (error) {
    next(error);
  }
});

export default router;
```