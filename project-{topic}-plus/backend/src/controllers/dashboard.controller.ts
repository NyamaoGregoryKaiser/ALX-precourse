```typescript
import { Request, Response, NextFunction } from 'express';
import * as dashboardService from '../services/dashboard.service';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';

export const createDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const dashboard = await dashboardService.createDashboard(userId, req.body);
    res.status(201).json({ status: 'success', data: dashboard });
  } catch (error: any) {
    logger.error(`Create dashboard error: ${error.message}`, { userId: (req.user as any)?.id, body: req.body, error });
    next(error);
  }
};

export const getAllDashboards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const dashboards = await dashboardService.getAllDashboards(userId);
    res.status(200).json({ status: 'success', data: dashboards });
  } catch (error: any) {
    logger.error(`Get all dashboards error: ${error.message}`, { userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const getDashboardById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const dashboardId = req.params.id;
    const dashboard = await dashboardService.getDashboardById(userId, dashboardId);
    res.status(200).json({ status: 'success', data: dashboard });
  } catch (error: any) {
    logger.error(`Get dashboard by ID error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const updateDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const dashboardId = req.params.id;
    const updatedDashboard = await dashboardService.updateDashboard(userId, dashboardId, req.body);
    res.status(200).json({ status: 'success', data: updatedDashboard });
  } catch (error: any) {
    logger.error(`Update dashboard error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, body: req.body, error });
    next(error);
  }
};

export const deleteDashboard = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const dashboardId = req.params.id;
    await dashboardService.deleteDashboard(userId, dashboardId);
    res.status(204).send(); // No Content
  } catch (error: any) {
    logger.error(`Delete dashboard error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};
```