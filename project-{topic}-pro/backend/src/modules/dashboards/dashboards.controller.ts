```typescript
import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboards.service';
import logger from '../../utils/logger';

const dashboardService = new DashboardService();

export class DashboardController {
    async createDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, description } = req.body;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const newDashboard = await dashboardService.createDashboard({
                name,
                description,
                userId: req.userId
            });
            res.status(201).json(newDashboard);
        } catch (error: any) {
            logger.error('Failed to create dashboard:', error.message);
            next(error);
        }
    }

    async getDashboards(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const dashboards = await dashboardService.getDashboardsByUserId(req.userId);
            res.status(200).json(dashboards);
        } catch (error: any) {
            logger.error('Failed to get dashboards:', error.message);
            next(error);
        }
    }

    async getDashboardById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const dashboard = await dashboardService.getDashboardById(id, req.userId);
            if (!dashboard) {
                return res.status(404).json({ message: 'Dashboard not found or unauthorized' });
            }
            res.status(200).json(dashboard);
        } catch (error: any) {
            logger.error(`Failed to get dashboard ${req.params.id}:`, error.message);
            next(error);
        }
    }

    async updateDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, description } = req.body;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const updatedDashboard = await dashboardService.updateDashboard(id, req.userId, {
                name,
                description
            });
            if (!updatedDashboard) {
                return res.status(404).json({ message: 'Dashboard not found or unauthorized' });
            }
            res.status(200).json(updatedDashboard);
        } catch (error: any) {
            logger.error(`Failed to update dashboard ${req.params.id}:`, error.message);
            next(error);
        }
    }

    async deleteDashboard(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const success = await dashboardService.deleteDashboard(id, req.userId);
            if (!success) {
                return res.status(404).json({ message: 'Dashboard not found or unauthorized' });
            }
            res.status(204).send(); // No content
        } catch (error: any) {
            logger.error(`Failed to delete dashboard ${req.params.id}:`, error.message);
            next(error);
        }
    }
}
```