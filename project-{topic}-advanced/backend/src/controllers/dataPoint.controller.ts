```typescript
import { Request, Response, NextFunction } from 'express';
import * as dataPointService from '../services/dataPoint.service';
import { SubmitDataPointDto, GetMetricDataQueryDto } from './dtos/dataPoint.dto';
import { serviceAuth } from '../middleware/auth.middleware';
import { UserRole } from '../entities/User';
import { BadRequestError } from '../middleware/errorHandler.middleware';
import logger from '../utils/logger';

export const submitDataPoint = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // apiKey is added to req by the serviceAuth middleware
    const apiKey = (req as any).apiKey as string;
    const { serviceId, metricName, value, timestamp, metadata } = req.body as SubmitDataPointDto;

    const newDataPoint = await dataPointService.submitDataPoint(
      apiKey,
      serviceId,
      value,
      new Date(timestamp), // Convert string timestamp to Date object
      metadata
    );
    res.status(201).json({ status: 'success', data: newDataPoint });
  } catch (error) {
    next(error);
  }
};

export const getMetricData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.serviceId;
    const userId = req.user!.id;
    const roles = req.user!.roles;

    // Ensure the user has permission to view this service's data
    // This check should ideally be in a service layer or dedicated middleware for reusability.
    // For now, let's keep it here, but a real-world scenario might involve a `canAccessService` helper.
    const service = await AppDataSource.getRepository(Service).findOneBy({ id: serviceId });
    if (!service) {
      return next(new NotFoundError('Service not found.'));
    }
    if (!roles.includes(UserRole.ADMIN) && service.userId !== userId) {
      return next(new ForbiddenError('You do not have permission to view data for this service.'));
    }

    const query = req.query as GetMetricDataQueryDto;

    const dataPoints = await dataPointService.getMetricData({
      serviceId,
      metricDefinitionId: query.metricDefinitionId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      interval: query.interval,
      aggregateFunction: query.aggregateFunction,
    });
    res.status(200).json({ status: 'success', data: dataPoints });
  } catch (error) {
    next(error);
  }
};
```