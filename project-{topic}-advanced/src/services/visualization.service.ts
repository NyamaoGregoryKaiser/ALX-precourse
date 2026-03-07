```typescript
import { AppDataSourceInstance } from '../database';
import { Visualization, ChartType } from '../database/entities/Visualization';
import { Dataset } from '../database/entities/Dataset';
import { Dashboard } from '../database/entities/Dashboard';
import { IChartConfiguration, IQueryOptions } from '../interfaces/data.interface';
import { CustomError } from '../interfaces/error.interface';
import { DatasetService } from './dataset.service';
import { transformDataForChart } from '../utils/dataProcessing.utils';
import logger from '../config/logger';

export class VisualizationService {
  private visualizationRepository = AppDataSourceInstance.getRepository(Visualization);
  private datasetRepository = AppDataSourceInstance.getRepository(Dataset);
  private dashboardRepository = AppDataSourceInstance.getRepository(Dashboard);
  private datasetService = new DatasetService();

  async createVisualization(
    name: string,
    chartType: ChartType,
    configuration: IChartConfiguration,
    datasetId: string,
    userId: string,
    dataMapping?: Record<string, any>,
    description?: string,
    dashboardId?: string | null
  ): Promise<Visualization> {
    const dataset = await this.datasetRepository.findOne({
      where: { id: datasetId },
      relations: ['dataSource'],
    });

    if (!dataset || dataset.dataSource.userId !== userId) {
      throw new CustomError(404, 'Dataset not found or you do not have permission to access it.');
    }

    let dashboard: Dashboard | null = null;
    if (dashboardId) {
      dashboard = await this.dashboardRepository.findOne({ where: { id: dashboardId, userId } });
      if (!dashboard) {
        throw new CustomError(404, 'Dashboard not found or you do not have permission to access it.');
      }
    }

    const newVisualization = this.visualizationRepository.create({
      name,
      chartType,
      configuration,
      dataMapping,
      description,
      dataset,
      datasetId,
      dashboard,
      dashboardId: dashboardId || null,
    });
    await this.visualizationRepository.save(newVisualization);
    logger.info(`Visualization '${name}' created by user ${userId}.`);
    return newVisualization;
  }

  async getAllVisualizations(userId: string): Promise<Visualization[]> {
    // Fetch visualizations that belong to datasets owned by the user, or dashboards owned by the user
    const visualizations = await this.visualizationRepository.find({
      relations: ['dataset', 'dataset.dataSource', 'dashboard'],
    });

    return visualizations.filter(viz =>
      (viz.dataset && viz.dataset.dataSource.userId === userId) ||
      (viz.dashboard && viz.dashboard.userId === userId)
    );
  }

  async getVisualizationById(id: string, userId: string): Promise<Visualization> {
    const visualization = await this.visualizationRepository.findOne({
      where: { id },
      relations: ['dataset', 'dataset.dataSource', 'dashboard'],
    });

    if (!visualization || ((visualization.dataset.dataSource.userId !== userId) && (visualization.dashboard?.userId !== userId))) {
      throw new CustomError(404, 'Visualization not found or you do not have permission to access it.');
    }
    return visualization;
  }

  async updateVisualization(
    id: string,
    userId: string,
    updates: Partial<{
      name: string;
      chartType: ChartType;
      configuration: IChartConfiguration;
      dataMapping: Record<string, any>;
      description: string;
      datasetId: string;
      dashboardId: string | null;
    }>
  ): Promise<Visualization> {
    const visualization = await this.getVisualizationById(id, userId); // Ensures user owns visualization

    // Handle dataset update
    if (updates.datasetId && updates.datasetId !== visualization.datasetId) {
      const newDataset = await this.datasetRepository.findOne({
        where: { id: updates.datasetId },
        relations: ['dataSource'],
      });
      if (!newDataset || newDataset.dataSource.userId !== userId) {
        throw new CustomError(404, 'New dataset not found or you do not have permission to access it.');
      }
      visualization.dataset = newDataset;
      visualization.datasetId = newDataset.id;
    }

    // Handle dashboard update
    if ('dashboardId' in updates) {
      if (updates.dashboardId === null) {
        visualization.dashboard = null;
        visualization.dashboardId = null;
      } else if (updates.dashboardId && updates.dashboardId !== visualization.dashboardId) {
        const newDashboard = await this.dashboardRepository.findOne({ where: { id: updates.dashboardId, userId } });
        if (!newDashboard) {
          throw new CustomError(404, 'New dashboard not found or you do not have permission to access it.');
        }
        visualization.dashboard = newDashboard;
        visualization.dashboardId = newDashboard.id;
      }
    }

    Object.assign(visualization, updates);
    await this.visualizationRepository.save(visualization);
    logger.info(`Visualization '${visualization.name}' updated by user ${userId}.`);
    return visualization;
  }

  async deleteVisualization(id: string, userId: string): Promise<void> {
    const visualization = await this.getVisualizationById(id, userId); // Ensures user owns visualization
    const result = await this.visualizationRepository.delete({ id });
    if (result.affected === 0) {
      throw new CustomError(404, 'Visualization not found.'); // Should not happen if getVisualizationById passes
    }
    logger.info(`Visualization ${id} deleted by user ${userId}.`);
  }

  async getVisualizationData(id: string, userId: string, options?: IQueryOptions): Promise<any[]> {
    const visualization = await this.getVisualizationById(id, userId); // Ensures user owns visualization
    const rawData = await this.datasetService.getDatasetData(visualization.datasetId, userId, options);

    // Apply data transformation based on chart type and configuration
    return transformDataForChart(rawData, visualization.chartType, visualization.dataMapping || {}, visualization.configuration);
  }
}
```