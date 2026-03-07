```typescript
import { Response, NextFunction } from 'express';
import { DatasetService } from '../services/dataset.service';
import { AuthenticatedRequest } from '../interfaces/auth.interface';
import { CustomError } from '../interfaces/error.interface';

const datasetService = new DatasetService();

export const createDataset = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { name, query, dataSourceId, description } = req.body;

    const dataset = await datasetService.createDataset(
      name,
      query,
      dataSourceId,
      req.user.id,
      description
    );
    res.status(201).json({ status: 'success', data: dataset });
  } catch (error) {
    next(error);
  }
};

export const getAllDatasets = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const datasets = await datasetService.getAllDatasets(req.user.id);
    res.status(200).json({ status: 'success', data: datasets });
  } catch (error) {
    next(error);
  }
};

export const getDatasetById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const dataset = await datasetService.getDatasetById(id, req.user.id);
    res.status(200).json({ status: 'success', data: dataset });
  } catch (error) {
    next(error);
  }
};

export const updateDataset = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const updates = req.body; // Body validated by middleware

    const updatedDataset = await datasetService.updateDataset(id, req.user.id, updates);
    res.status(200).json({ status: 'success', data: updatedDataset });
  } catch (error) {
    next(error);
  }
};

export const deleteDataset = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    await datasetService.deleteDataset(id, req.user.id);
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};

export const getDatasetData = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const { limit, offset, sortBy, sortOrder, filters } = req.query; // Add query params for filtering/pagination

    const data = await datasetService.getDatasetData(id, req.user.id, {
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