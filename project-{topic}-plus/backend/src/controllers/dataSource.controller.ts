```typescript
import { Request, Response, NextFunction } from 'express';
import * as dataSourceService from '../services/dataSource.service';
import { AppError } from '../utils/appError';
import { logger } from '../utils/logger';
import fs from 'fs';

// Extend Request to include file property
declare module 'express' {
  interface Request {
    file?: Express.Multer.File;
  }
}

export const createDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const dataSource = await dataSourceService.createDataSource(userId, req.body);
    res.status(201).json({ status: 'success', data: dataSource });
  } catch (error: any) {
    logger.error(`Create data source error: ${error.message}`, { userId: (req.user as any)?.id, body: req.body, error });
    next(error);
  }
};

export const uploadCsvDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    if (!req.file) {
      throw new AppError('No file uploaded.', 400);
    }

    const { name, description } = req.body;
    if (!name) {
      throw new AppError('Data source name is required.', 400);
    }

    // Process CSV and store in DB (or just store path for now and process on demand)
    const filePath = req.file.path;
    const originalFileName = req.file.originalname;

    const dataSource = await dataSourceService.createCsvDataSource(userId, name, description, filePath, originalFileName);

    // Optionally delete the temporary file after processing or storing its content
    // fs.unlink(filePath, (err) => {
    //   if (err) logger.error(`Error deleting temporary file ${filePath}:`, err);
    // });

    res.status(201).json({ status: 'success', data: dataSource });
  } catch (error: any) {
    // Ensure temporary file is cleaned up on error as well
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlink(req.file.path, (err) => {
        if (err) logger.error(`Error deleting temporary file ${req.file?.path} on error:`, err);
      });
    }
    logger.error(`Upload CSV data source error: ${error.message}`, { userId: (req.user as any)?.id, body: req.body, file: req.file, error });
    next(error);
  }
};


export const getAllDataSources = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.user as any).id;
    const dataSources = await dataSourceService.getAllDataSources(userId);
    res.status(200).json({ status: 'success', data: dataSources });
  } catch (error: any) {
    logger.error(`Get all data sources error: ${error.message}`, { userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const getDataSourceById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSourceId = req.params.id;
    const dataSource = req.resource; // Set by checkOwnership middleware
    res.status(200).json({ status: 'success', data: dataSource });
  } catch (error: any) {
    logger.error(`Get data source by ID error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const updateDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSourceId = req.params.id;
    const userId = (req.user as any).id;
    const updatedDataSource = await dataSourceService.updateDataSource(userId, dataSourceId, req.body);
    res.status(200).json({ status: 'success', data: updatedDataSource });
  } catch (error: any) {
    logger.error(`Update data source error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, body: req.body, error });
    next(error);
  }
};

export const deleteDataSource = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSourceId = req.params.id;
    const userId = (req.user as any).id;
    await dataSourceService.deleteDataSource(userId, dataSourceId);
    res.status(204).send(); // No Content
  } catch (error: any) {
    logger.error(`Delete data source error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};

export const getDataSourceData = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dataSourceId = req.params.id;
    const userId = (req.user as any).id;
    const data = await dataSourceService.getProcessedDataSourceData(userId, dataSourceId);
    res.status(200).json({ status: 'success', data: data });
  } catch (error: any) {
    logger.error(`Get data source data error: ${error.message}`, { id: req.params.id, userId: (req.user as any)?.id, error });
    next(error);
  }
};
```