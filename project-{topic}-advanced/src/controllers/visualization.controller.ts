```typescript
import { Response, NextFunction } from 'express';
import { VisualizationService } from '../services/visualization.service';
import { AuthenticatedRequest } from '../interfaces/auth.interface';
import { CustomError } from '../interfaces/error.interface';

const visualizationService = new VisualizationService();

export const createVisualization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { name, chartType, configuration, dataMapping, description, datasetId, dashboardId } = req.body;

    const visualization = await visualizationService.createVisualization(
      name,
      chartType,
      configuration,
      datasetId,
      req.user.id,
      dataMapping,
      description,
      dashboardId
    );
    res.status(201).json({ status: 'success', data: visualization });
  } catch (error) {
    next(error);
  }
};

export const getAllVisualizations = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const visualizations = await visualizationService.getAllVisualizations(req.user.id);
    res.status(200).json({ status: 'success', data: visualizations });
  } catch (error) {
    next(error);
  }
};

export const getVisualizationById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const visualization = await visualizationService.getVisualizationById(id, req.user.id);
    res.status(200).json({ status: 'success', data: visualization });
  } catch (error) {
    next(error);
  }
};

export const updateVisualization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const updates = req.body; // Body validated by middleware

    const updatedVisualization = await visualizationService.updateVisualization(id, req.user.id, updates);
    res.status(200).json({ status: 'success', data: updatedVisualization });
  } catch (error) {
    next(error);
  }
};

export const deleteVisualization = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    await visualizationService.deleteVisualization(id, req.user.id);
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};

export const getVisualizationData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const { limit, offset, sortBy, sortOrder, filters } = req.query;

    const data = await visualizationService.getVisualizationData(id, req.user.id, {
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'ASC' | 'DESC',
      filters: filters ? JSON.parse(filters as string) : undefined,
    });
    res.status(200).json({ status: 'success', data });
  } catch (error) {
    next(error);
  }
};
```