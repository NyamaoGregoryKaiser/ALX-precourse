```typescript
import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { GetServiceDashboardQueryDto } from './dtos/dashboard.dto';
import logger from '../utils/logger';

export const getGlobalDashboardSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const roles = req.user!.roles;
    const summary = await dashboardService.getGlobalDashboardSummary(userId, roles);
    res.status(200).json({ status: 'success', data: summary });
  } catch (error) {
    next(error);
  }
};

export const getServiceDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const serviceId = req.params.id;
    const userId = req.user!.id;
    const roles = req.user!.roles;
    const query = req.query as GetServiceDashboardQueryDto;

    const dashboardData = await dashboardService.getServiceDashboardData(
      serviceId,
      userId,
      roles,
      {
        timeRange: query.timeRange,
        interval: query.interval,
        aggregateFunction: query.aggregateFunction,
      }
    );
    res.status(200).json({ status: 'success', data: dashboardData });
  } catch (error) {
    next(error);
  }
};
```