import { Request, Response, NextFunction } from 'express';
import { dataSourceService } from '../services/dataSourceService';
import { CustomError } from '../middleware/errorHandler';

class DataSourceController {
  async createDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, type, config } = req.body;
      if (!name || !type || !config) {
        throw new CustomError('Name, type, and config are required for a data source', 400);
      }
      const newDataSource = await dataSourceService.createDataSource(name, type, config, req.user!.id);
      res.status(201).json(newDataSource);
    } catch (error) {
      next(error);
    }
  }

  async getAllDataSources(req: Request, res: Response, next: NextFunction) {
    try {
      const dataSources = await dataSourceService.getAllDataSources(req.user!.id);
      res.status(200).json(dataSources);
    } catch (error) {
      next(error);
    }
  }

  async getDataSourceById(req: Request, res: Response, next: NextFunction) {
    try {
      const dataSource = await dataSourceService.getDataSourceById(req.params.id, req.user!.id);
      res.status(200).json(dataSource);
    } catch (error) {
      next(error);
    }
  }

  async updateDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const updatedDataSource = await dataSourceService.updateDataSource(req.params.id, req.user!.id, req.body);
      res.status(200).json(updatedDataSource);
    } catch (error) {
      next(error);
    }
  }

  async deleteDataSource(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await dataSourceService.deleteDataSource(req.params.id, req.user!.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getData(req: Request, res: Response, next: NextFunction) {
    try {
      const { query } = req.body; // Expect query for aggregation/filtering
      const data = await dataSourceService.fetchDataFromSource(req.params.id, req.user!.id, query);
      res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
}

export const dataSourceController = new DataSourceController();