```typescript
import { Request, Response, NextFunction } from 'express';
import { ChartService } from './charts.service';
import { DataQueryService } from '../../services/DataQueryService';
import logger from '../../utils/logger';

const chartService = new ChartService();
const dataQueryService = new DataQueryService();

export class ChartController {
    async createChart(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, type, configuration, query, dataSourceId } = req.body;
            const { dashboardId } = req.params; // Get dashboardId from route params
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const newChart = await chartService.createChart({
                name,
                type,
                configuration,
                query,
                dashboardId,
                dataSourceId,
                userId: req.userId // Pass userId for ownership check
            });
            res.status(201).json(newChart);
        } catch (error: any) {
            logger.error('Failed to create chart:', error.message);
            next(error);
        }
    }

    async getChartsByDashboardId(req: Request, res: Response, next: NextFunction) {
        try {
            const { dashboardId } = req.params;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const charts = await chartService.getChartsByDashboardId(dashboardId, req.userId);
            res.status(200).json(charts);
        } catch (error: any) {
            logger.error(`Failed to get charts for dashboard ${req.params.dashboardId}:`, error.message);
            next(error);
        }
    }

    async getChartById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params; // Chart ID
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const chart = await chartService.getChartById(id, req.userId);
            if (!chart) {
                return res.status(404).json({ message: 'Chart not found or unauthorized' });
            }
            res.status(200).json(chart);
        } catch (error: any) {
            logger.error(`Failed to get chart ${req.params.id}:`, error.message);
            next(error);
        }
    }

    async updateChart(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params; // Chart ID
            const { name, type, configuration, query, dataSourceId } = req.body;
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const updatedChart = await chartService.updateChart(id, req.userId, {
                name,
                type,
                configuration,
                query,
                dataSourceId
            });
            if (!updatedChart) {
                return res.status(404).json({ message: 'Chart not found or unauthorized' });
            }
            res.status(200).json(updatedChart);
        } catch (error: any) {
            logger.error(`Failed to update chart ${req.params.id}:`, error.message);
            next(error);
        }
    }

    async deleteChart(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params; // Chart ID
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }
            const success = await chartService.deleteChart(id, req.userId);
            if (!success) {
                return res.status(404).json({ message: 'Chart not found or unauthorized' });
            }
            res.status(204).send(); // No content
        } catch (error: any) {
            logger.error(`Failed to delete chart ${req.params.id}:`, error.message);
            next(error);
        }
    }

    async getChartData(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params; // Chart ID
            if (!req.userId) {
                return res.status(401).json({ message: 'User not authenticated' });
            }

            const chart = await chartService.getChartById(id, req.userId);
            if (!chart) {
                return res.status(404).json({ message: 'Chart not found or unauthorized' });
            }

            const data = await dataQueryService.executeQuery(chart.dataSourceId, chart.query, req.userId);
            res.status(200).json(data);
        } catch (error: any) {
            logger.error(`Failed to get data for chart ${req.params.id}:`, error.message);
            next(error);
        }
    }
}
```