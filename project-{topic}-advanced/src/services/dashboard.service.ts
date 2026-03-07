```typescript
import { AppDataSourceInstance } from '../database';
import { Dashboard } from '../database/entities/Dashboard';
import { User } from '../database/entities/User';
import { Visualization } from '../database/entities/Visualization';
import { IDashboardLayout } from '../interfaces/data.interface';
import { CustomError } from '../interfaces/error.interface';
import logger from '../config/logger';

export class DashboardService {
  private dashboardRepository = AppDataSourceInstance.getRepository(Dashboard);
  private userRepository = AppDataSourceInstance.getRepository(User);
  private visualizationRepository = AppDataSourceInstance.getRepository(Visualization);

  async createDashboard(
    name: string,
    userId: string,
    description?: string,
    layout?: IDashboardLayout
  ): Promise<Dashboard> {
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new CustomError(404, 'User not found.');
    }

    const newDashboard = this.dashboardRepository.create({
      name,
      description,
      layout,
      user,
      userId,
    });
    await this.dashboardRepository.save(newDashboard);
    logger.info(`Dashboard '${name}' created by user ${userId}.`);
    return newDashboard;
  }

  async getAllDashboards(userId: string): Promise<Dashboard[]> {
    return this.dashboardRepository.find({
      where: { userId },
      relations: ['visualizations'], // Optionally load visualizations
    });
  }

  async getDashboardById(id: string, userId: string): Promise<Dashboard> {
    const dashboard = await this.dashboardRepository.findOne({
      where: { id, userId },
      relations: ['visualizations', 'visualizations.dataset', 'visualizations.dataset.dataSource'],
    });
    if (!dashboard) {
      throw new CustomError(404, 'Dashboard not found or you do not have permission to access it.');
    }
    return dashboard;
  }

  async updateDashboard(
    id: string,
    userId: string,
    updates: Partial<{ name: string; description: string; layout: IDashboardLayout }>
  ): Promise<Dashboard> {
    const dashboard = await this.getDashboardById(id, userId); // Ensures user owns dashboard
    Object.assign(dashboard, updates);
    await this.dashboardRepository.save(dashboard);
    logger.info(`Dashboard '${dashboard.name}' updated by user ${userId}.`);
    return dashboard;
  }

  async deleteDashboard(id: string, userId: string): Promise<void> {
    const result = await this.dashboardRepository.delete({ id, userId });
    if (result.affected === 0) {
      throw new CustomError(404, 'Dashboard not found or you do not have permission to delete it.');
    }
    logger.info(`Dashboard ${id} deleted by user ${userId}.`);
  }

  async addVisualizationToDashboard(dashboardId: string, visualizationId: string, userId: string): Promise<Dashboard> {
    const dashboard = await this.getDashboardById(dashboardId, userId);
    const visualization = await this.visualizationRepository.findOne({
      where: { id: visualizationId },
      relations: ['dataset', 'dataset.dataSource'],
    });

    if (!visualization || visualization.dataset.dataSource.userId !== userId) {
      throw new CustomError(404, 'Visualization not found or you do not have permission to add it.');
    }

    if (visualization.dashboardId && visualization.dashboardId !== dashboardId) {
      throw new CustomError(400, 'Visualization is already assigned to another dashboard.');
    }

    visualization.dashboard = dashboard;
    visualization.dashboardId = dashboard.id;
    await this.visualizationRepository.save(visualization);

    // Refresh dashboard to include the new visualization
    const updatedDashboard = await this.getDashboardById(dashboardId, userId);
    logger.info(`Visualization ${visualizationId} added to dashboard ${dashboardId} by user ${userId}.`);
    return updatedDashboard;
  }

  async removeVisualizationFromDashboard(dashboardId: string, visualizationId: string, userId: string): Promise<Dashboard> {
    const dashboard = await this.getDashboardById(dashboardId, userId);
    const visualization = await this.visualizationRepository.findOne({
      where: { id: visualizationId, dashboardId: dashboard.id }, // Ensure visualization is part of this dashboard
    });

    if (!visualization) {
      throw new CustomError(404, 'Visualization not found in this dashboard or you do not have permission to remove it.');
    }

    visualization.dashboard = null;
    visualization.dashboardId = null;
    await this.visualizationRepository.save(visualization);

    // Refresh dashboard
    const updatedDashboard = await this.getDashboardById(dashboardId, userId);
    logger.info(`Visualization ${visualizationId} removed from dashboard ${dashboardId} by user ${userId}.`);
    return updatedDashboard;
  }
}
```