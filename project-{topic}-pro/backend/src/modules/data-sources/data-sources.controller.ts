```typescript
import { Request, Response, NextFunction } from 'express';
import { DataSourceService } from './data-sources.service';
import logger from '../../utils/logger';

const dataSourceService = new DataSourceService();

export class DataSourceController {
    async createDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, type, connectionDetails } = req.body;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const newDataSource = await dataSourceService.createDataSource({
                name,
                type,
                connectionDetails,
                userId: req.userId
            });
            res.status(201).json(newDataSource);
        } catch (error: any) {
            logger.error('Failed to create data source:', error.message);
            next(error);
        }
    }

    async getDataSources(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const dataSources = await dataSourceService.getDataSourcesByUserId(req.userId);
            res.status(200).json(dataSources);
        } catch (error: any) {
            logger.error('Failed to get data sources:', error.message);
            next(error);
        }
    }

    async getDataSourceById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const dataSource = await dataSourceService.getDataSourceById(id, req.userId);
            if (!dataSource) {
                return res.status(404).json({ message: 'Data Source not found or unauthorized' });
            }
            res.status(200).json(dataSource);
        } catch (error: any) {
            logger.error(`Failed to get data source ${req.params.id}:`, error.message);
            next(error);
        }
    }

    async updateDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, type, connectionDetails } = req.body;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const updatedDataSource = await dataSourceService.updateDataSource(id, req.userId, {
                name,
                type,
                connectionDetails
            });
            if (!updatedDataSource) {
                return res.status(404).json({ message: 'Data Source not found or unauthorized' });
            }
            res.status(200).json(updatedDataSource);
        } catch (error: any) {
            logger.error(`Failed to update data source ${req.params.id}:`, error.message);
            next(error);
        }
    }

    async deleteDataSource(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const success = await dataSourceService.deleteDataSource(id, req.userId);
            if (!success) {
                return res.status(404).json({ message: 'Data Source not found or unauthorized' });
            }
            res.status(204).send(); // No content
        } catch (error: any) {
            logger.error(`Failed to delete data source ${req.params.id}:`, error.message);
            next(error);
        }
    }
}
```