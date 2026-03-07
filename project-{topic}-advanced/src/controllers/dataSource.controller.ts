```typescript
import { Response, NextFunction } from 'express';
import { DataSourceService } from '../services/dataSource.service';
import { AuthenticatedRequest } from '../interfaces/auth.interface';
import { createDataSourceSchema, updateDataSourceSchema } from '../utils/validation.utils';

const dataSourceService = new DataSourceService();

export const createDataSource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { name, type, connectionConfig, description } = req.body;

    const dataSource = await dataSourceService.createDataSource(
      name,
      type,
      connectionConfig,
      req.user.id,
      description
    );
    res.status(201).json({ status: 'success', data: dataSource });
  } catch (error) {
    next(error);
  }
};

export const getAllDataSources = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const dataSources = await dataSourceService.getAllDataSources(req.user.id);
    res.status(200).json({ status: 'success', data: dataSources });
  } catch (error) {
    next(error);
  }
};

export const getDataSourceById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const dataSource = await dataSourceService.getDataSourceById(id, req.user.id);
    res.status(200).json({ status: 'success', data: dataSource });
  } catch (error) {
    next(error);
  }
};

export const updateDataSource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const updates = req.body; // Body validated by middleware

    const updatedDataSource = await dataSourceService.updateDataSource(id, req.user.id, updates);
    res.status(200).json({ status: 'success', data: updatedDataSource });
  } catch (error) {
    next(error);
  }
};

export const deleteDataSource = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    await dataSourceService.deleteDataSource(id, req.user.id);
    res.status(204).send(); // No content
  } catch (error) {
    next(error);
  }
};

export const testDataSourceConnection = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) return next(new CustomError(401, 'Unauthorized'));
    const { id } = req.params;
    const isConnected = await dataSourceService.testDataSourceConnection(id, req.user.id);
    res.status(200).json({ status: 'success', data: { connected: isConnected } });
  } catch (error) {
    next(error);
  }
};
```