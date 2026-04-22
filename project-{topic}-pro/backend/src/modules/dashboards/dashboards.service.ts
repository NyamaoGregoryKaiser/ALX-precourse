```typescript
import { AppDataSource } from '../../database/data-source';
import { Dashboard } from '../../database/entities/Dashboard';
import { Repository } from 'typeorm';
import logger from '../../utils/logger';

interface CreateDashboardDto {
    name: string;
    description?: string;
    userId: string;
}

interface UpdateDashboardDto {
    name?: string;
    description?: string;
}

export class DashboardService {
    private dashboardRepository: Repository<Dashboard>;

    constructor() {
        this.dashboardRepository = AppDataSource.getRepository(Dashboard);
    }

    async createDashboard(data: CreateDashboardDto): Promise<Dashboard> {
        try {
            const newDashboard = this.dashboardRepository.create(data);
            await this.dashboardRepository.save(newDashboard);
            logger.info(`Dashboard created: ${newDashboard.name} for user ${data.userId}`);
            return newDashboard;
        } catch (error) {
            logger.error('Error creating dashboard:', error);
            throw new Error('Failed to create dashboard');
        }
    }

    async getDashboardsByUserId(userId: string): Promise<Dashboard[]> {
        try {
            return await this.dashboardRepository.find({ where: { userId } });
        } catch (error) {
            logger.error(`Error getting dashboards for user ${userId}:`, error);
            throw new Error('Failed to retrieve dashboards');
        }
    }

    async getDashboardById(id: string, userId: string): Promise<Dashboard | null> {
        try {
            // Also load charts associated with the dashboard
            return await this.dashboardRepository.findOne({
                where: { id, userId },
                relations: ['charts'] // Eager load charts for the dashboard detail view
            });
        } catch (error) {
            logger.error(`Error getting dashboard ${id} for user ${userId}:`, error);
            throw new Error('Failed to retrieve dashboard');
        }
    }

    async updateDashboard(id: string, userId: string, data: UpdateDashboardDto): Promise<Dashboard | null> {
        try {
            const dashboard = await this.dashboardRepository.findOne({ where: { id, userId } });
            if (!dashboard) {
                return null;
            }

            Object.assign(dashboard, data);
            await this.dashboardRepository.save(dashboard);
            logger.info(`Dashboard updated: ${dashboard.name} by user ${userId}`);
            return dashboard;
        } catch (error) {
            logger.error(`Error updating dashboard ${id} for user ${userId}:`, error);
            throw new Error('Failed to update dashboard');
        }
    }

    async deleteDashboard(id: string, userId: string): Promise<boolean> {
        try {
            const result = await this.dashboardRepository.delete({ id, userId });
            if (result.affected && result.affected > 0) {
                logger.info(`Dashboard deleted: ${id} by user ${userId}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Error deleting dashboard ${id} for user ${userId}:`, error);
            throw new Error('Failed to delete dashboard');
        }
    }
}
```