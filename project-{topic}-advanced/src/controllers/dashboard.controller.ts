```typescript
import { Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { AuthenticatedRequest } from '../interfaces/auth.interface';
import { CustomError } from '../interfaces/error.interface';

const dashboardService = new DashboardService();

export const createDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { name, description, layout } = req.body;

    const dashboard = await dashboardService.createDashboard(
      name,
      req.user.id,
      description,
      layout
    );
    res.status(201).json({ status: 'success', data: dashboard });
  } catch (error) {
    next(error);
  }
};

export const getAllDashboards = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const dashboards = await dashboardService.getAllDashboards(req.user.id);
    res.status(200).json({ status: 'success', data: dashboards });
  } catch (error) {
    next(error);
  }
};

export const getDashboardById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const dashboard = await dashboardService.getDashboardById(id, req.user.id);
    res.status(200).json({ status: 'success', data: dashboard });
  } catch (error) {
    next(error);
  }
};

export const updateDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const updates = req.body; // Body validated by middleware

    const updatedDashboard = await dashboardService.updateDashboard(id, req.user.id, updates);
    res.status(200).json({ status: 'success', data: updatedDashboard });
  } catch (error) {
    next(error);
  }
};

export const deleteDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    await dashboardService.deleteDashboard(id, req.user.id);
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};

export const addVisualizationToDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id: dashboardId } = req.params;
    const { visualizationId } = req.body;

    const dashboard = await dashboardService.addVisualizationToDashboard(dashboardId, visualizationId, req.user.id);
    res.status(200).json({ status: 'success', data: dashboard });
  } catch (error) {
    next(error);
  }
};

export const removeVisualizationFromDashboard = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id: dashboardId, visualizationId } = req.params;

    const dashboard = await dashboardService.removeVisualizationFromDashboard(dashboardId, visualizationId, req.user.id);
    res.status(200).json({ status: 'success', data: dashboard });
  } catch (error) {
    next(error);
  }
};
```