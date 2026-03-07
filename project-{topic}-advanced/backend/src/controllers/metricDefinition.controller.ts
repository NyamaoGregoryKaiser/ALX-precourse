```typescript
import { Request, Response, NextFunction } from 'express';
import * as metricDefinitionService from '../services/metricDefinition.service';
import { CreateMetricDefinitionDto, UpdateMetricDefinitionDto } from './dtos/metricDefinition.dto';
import { UserRole } from '../entities/User';
import { MetricType } from '../entities/MetricDefinition';
import logger from '../utils/logger';

export const createMetricDefinition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.serviceId;
    const { name, type, unit, thresholds } = req.body as CreateMetricDefinitionDto;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    const newMetric = await metricDefinitionService.createMetricDefinition(
      serviceId,
      name,
      type,
      unit,
      thresholds,
      userId,
      roles
    );
    res.status(201).json({ status: 'success', data: newMetric });
  } catch (error) {
    next(error);
  }
};

export const getMetricDefinitionsByService = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.serviceId;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    const metrics = await metricDefinitionService.getMetricDefinitionsByService(serviceId, userId, roles);
    res.status(200).json({ status: 'success', data: metrics });
  } catch (error) {
    next(error);
  }
};

export const getMetricDefinitionById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metricId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    const metric = await metricDefinitionService.getMetricDefinitionById(metricId, userId, roles);
    res.status(200).json({ status: 'success', data: metric });
  } catch (error) {
    next(error);
  }
};

export const updateMetricDefinition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metricId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;
    const { name, type, unit, thresholds } = req.body as UpdateMetricDefinitionDto;

    const updatedMetric = await metricDefinitionService.updateMetricDefinition(
      metricId,
      userId,
      roles,
      name,
      type,
      unit,
      thresholds
    );
    res.status(200).json({ status: 'success', data: updatedMetric });
  } catch (error) {
    next(error);
  }
};

export const deleteMetricDefinition = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const metricId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    await metricDefinitionService.deleteMetricDefinition(metricId, userId, roles);
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};
```