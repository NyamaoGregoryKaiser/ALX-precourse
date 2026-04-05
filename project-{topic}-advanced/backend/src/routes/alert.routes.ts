```typescript
import { Router, NextFunction, Response } from 'express';
import { AppDataSource } from '../database/data-source';
import { AlertService } from '../services/alert.service';
import { AlertRepository } from '../repositories/Alert.repository';
import { MonitorRepository } from '../repositories/Monitor.repository'; // Needed for ownership check
import { authenticate, AuthRequest } from '../middleware/auth.middleware';
import { validate, idSchema } from '../middleware/validation.middleware';
import { AlertCondition, AlertType } from '../entities/Alert.entity';
import Joi from 'joi';
import { StatusCodes } from 'http-status-codes';
import { ApiError } from '../utils/api-error';
import { Alert } from '../entities/Alert.entity';
import logger from '../utils/logger';

const router = Router();
const alertRepository = new AlertRepository(AppDataSource.getRepository(Alert));
const monitorRepository = new MonitorRepository(AppDataSource.getRepository(MonitorRepository)); // Corrected to use Monitor entity type
const alertService = new AlertService(alertRepository, monitorRepository);

// Schemas for validation
const createAlertSchema = Joi.object({
  monitorId: Joi.string().uuid().required(),
  type: Joi.string().valid(...Object.values(AlertType)).required(),
  threshold: Joi.number().integer().required(),
  condition: Joi.string().valid(...Object.values(AlertCondition)).required(),
  message: Joi.string().max(500).optional().allow(null, ''),
  isActive: Joi.boolean().default(true),
});

const updateAlertSchema = Joi.object({
  type: Joi.string().valid(...Object.values(AlertType)).optional(),
  threshold: Joi.number().integer().optional(),
  condition: Joi.string().valid(...Object.values(AlertCondition)).optional(),
  message: Joi.string().max(500).optional().allow(null, ''),
  isActive: Joi.boolean().optional(),
  status: Joi.string().valid('ok', 'alert', 'resolved').optional(), // Only for admin or specific scenarios
});


// Middleware to check alert ownership (via its monitor)
const checkAlertOwnership = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const { id } = req.params;
  const alert = await alertRepository.findOne({
    where: { id },
    relations: ['monitor', 'monitor.project'],
  });

  if (!alert || alert.monitor.project.userId !== req.user!.id) {
    return next(new ApiError(StatusCodes.NOT_FOUND, 'Alert not found or you do not have access.'));
  }
  next();
};

router.use(authenticate); // All alert routes require authentication

// Get all alerts for a specific monitor
router.get('/monitors/:monitorId', validate(idSchema.keys({ monitorId: Joi.string().uuid().required() }), 'params'), async (req: AuthRequest, res, next) => {
  try {
    const alerts = await alertService.getAlertsByMonitorId(req.params.monitorId, req.user!.id);
    res.status(StatusCodes.OK).json(alerts);
  } catch (error) {
    next(error);
  }
});

// Get a specific alert by ID
router.get('/:id', validate(idSchema, 'params'), checkAlertOwnership, async (req: AuthRequest, res, next) => {
  try {
    const alert = await alertService.getAlertById(req.params.id, req.user!.id);
    res.status(StatusCodes.OK).json(alert);
  } catch (error) {
    next(error);
  }
});

// Create a new alert
router.post('/', validate(createAlertSchema), async (req: AuthRequest, res, next) => {
  try {
    const alert = await alertService.createAlert(req.body, req.user!.id);
    res.status(StatusCodes.CREATED).json(alert);
  } catch (error) {
    next(error);
  }
});

// Update an alert
router.put('/:id', validate(idSchema, 'params'), validate(updateAlertSchema), checkAlertOwnership, async (req: AuthRequest, res, next) => {
  try {
    const updatedAlert = await alertService.updateAlert(req.params.id, req.body, req.user!.id);
    res.status(StatusCodes.OK).json(updatedAlert);
  } catch (error) {
    next(error);
  }
});

// Delete an alert
router.delete('/:id', validate(idSchema, 'params'), checkAlertOwnership, async (req: AuthRequest, res, next) => {
  try {
    await alertService.deleteAlert(req.params.id, req.user!.id);
    res.status(StatusCodes.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```