```typescript
import { AppDataSource } from '../../database/data-source';
import { Chart, ChartType } from '../../database/entities/Chart';
import { Repository } from 'typeorm';
import logger from '../../utils/logger';
import { Dashboard } from '../../database/entities/Dashboard';

interface CreateChartDto {
    name: string;
    type: ChartType;
    configuration: Record<string, any>;
    query: string;
    dashboardId: string;
    dataSourceId: string;
    userId: string; // Used for authorization checks, not stored in Chart entity directly
}

interface UpdateChartDto {
    name?: string;
    type?: ChartType;
    configuration?: Record<string, any>;
    query?: string;
    dataSourceId?: string;
}

export class ChartService {
    private chartRepository: Repository<Chart>;
    private dashboardRepository: Repository<Dashboard>;

    constructor() {
        this.chartRepository = AppDataSource.getRepository(Chart);
        this.dashboardRepository = AppDataSource.getRepository(Dashboard);
    }

    async createChart(data: CreateChartDto): Promise<Chart> {
        try {
            // Ensure the dashboard belongs to the user
            const dashboard = await this.dashboardRepository.findOne({
                where: { id: data.dashboardId, userId: data.userId }
            });

            if (!dashboard) {
                throw new Error('Dashboard not found or unauthorized.');
            }

            const newChart = this.chartRepository.create({
                name: data.name,
                type: data.type,
                configuration: data.configuration,
                query: data.query,
                dashboardId: data.dashboardId,
                dataSourceId: data.dataSourceId
            });
            await this.chartRepository.save(newChart);
            logger.info(`Chart created: ${newChart.name} in dashboard ${data.dashboardId} by user ${data.userId}`);
            return newChart;
        } catch (error) {
            logger.error('Error creating chart:', error);
            throw new Error('Failed to create chart');
        }
    }

    async getChartsByDashboardId(dashboardId: string, userId: string): Promise<Chart[]> {
        try {
            // Ensure the dashboard belongs to the user
            const dashboard = await this.dashboardRepository.findOne({
                where: { id: dashboardId, userId: userId }
            });

            if (!dashboard) {
                // Return empty array or throw error based on desired behavior for unauthorized dashboard
                logger.warn(`User ${userId} attempted to access charts for unauthorized dashboard ${dashboardId}`);
                return [];
            }

            return await this.chartRepository.find({ where: { dashboardId } });
        } catch (error) {
            logger.error(`Error getting charts for dashboard ${dashboardId} by user ${userId}:`, error);
            throw new Error('Failed to retrieve charts');
        }
    }

    async getChartById(id: string, userId: string): Promise<Chart | null> {
        try {
            const chart = await this.chartRepository.findOne({
                where: { id },
                relations: ['dashboard'] // Eager load dashboard to check ownership
            });

            if (!chart || chart.dashboard.userId !== userId) {
                return null; // Not found or not authorized
            }
            return chart;
        } catch (error) {
            logger.error(`Error getting chart ${id} for user ${userId}:`, error);
            throw new Error('Failed to retrieve chart');
        }
    }

    async updateChart(id: string, userId: string, data: UpdateChartDto): Promise<Chart | null> {
        try {
            const chart = await this.chartRepository.findOne({
                where: { id },
                relations: ['dashboard']
            });

            if (!chart || chart.dashboard.userId !== userId) {
                return null; // Not found or not authorized
            }

            Object.assign(chart, data);
            await this.chartRepository.save(chart);
            logger.info(`Chart updated: ${chart.name} by user ${userId}`);
            return chart;
        } catch (error) {
            logger.error(`Error updating chart ${id} for user ${userId}:`, error);
            throw new Error('Failed to update chart');
        }
    }

    async deleteChart(id: string, userId: string): Promise<boolean> {
        try {
            const chart = await this.chartRepository.findOne({
                where: { id },
                relations: ['dashboard']
            });

            if (!chart || chart.dashboard.userId !== userId) {
                return false; // Not found or not authorized
            }

            const result = await this.chartRepository.delete({ id });
            if (result.affected && result.affected > 0) {
                logger.info(`Chart deleted: ${id} by user ${userId}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Error deleting chart ${id} for user ${userId}:`, error);
            throw new Error('Failed to delete chart');
        }
    }
}
```