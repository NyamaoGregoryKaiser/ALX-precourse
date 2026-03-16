import { AppDataSource } from '../db/data-source';
import { Visualization, VisualizationType } from '../db/entities/Visualization';
import { Dashboard } from '../db/entities/Dashboard';
import { DataSource } from '../db/entities/DataSource';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

class VisualizationService {
  private visualizationRepository = AppDataSource.getRepository(Visualization);
  private dashboardRepository = AppDataSource.getRepository(Dashboard);
  private dataSourceRepository = AppDataSource.getRepository(DataSource);

  async createVisualization(
    title: string,
    type: VisualizationType,
    dashboardId: string,
    dataSourceId: string | null,
    query: any = {},
    config: any = {},
    description: string = ''
  ) {
    const dashboard = await this.dashboardRepository.findOne({ where: { id: dashboardId } });
    if (!dashboard) {
      throw new CustomError('Dashboard not found', 404);
    }

    let dataSource: DataSource | null = null;
    if (dataSourceId) {
      dataSource = await this.dataSourceRepository.findOne({ where: { id: dataSourceId } });
      if (!dataSource) {
        throw new CustomError('Data Source not found', 404);
      }
      if (dataSource.ownerId !== dashboard.ownerId) { // Ensure dashboard owner owns the data source
          throw new CustomError('Data Source does not belong to the dashboard owner', 403);
      }
    }

    const newVisualization = this.visualizationRepository.create({
      title,
      type,
      description,
      config,
      query,
      dashboard,
      dataSource,
    });
    await this.visualizationRepository.save(newVisualization);
    logger.info(`Visualization ${newVisualization.id} created for dashboard ${dashboardId}`);
    return newVisualization;
  }

  async getVisualizationById(id: string, ownerId: string) {
    const visualization = await this.visualizationRepository.findOne({
      where: { id, dashboard: { ownerId: ownerId } },
      relations: ['dashboard', 'dataSource'],
    });
    if (!visualization) {
      throw new CustomError('Visualization not found or not owned by user', 404);
    }
    return visualization;
  }

  async getAllVisualizationsForDashboard(dashboardId: string, ownerId: string) {
    const dashboard = await this.dashboardRepository.findOne({ where: { id: dashboardId, ownerId: ownerId } });
    if (!dashboard) {
        throw new CustomError('Dashboard not found or not owned by user', 404);
    }
    return this.visualizationRepository.find({
        where: { dashboardId },
        relations: ['dataSource'],
        order: { createdAt: 'ASC' }
    });
  }

  async updateVisualization(id: string, ownerId: string, updateData: Partial<Visualization>) {
    const visualization = await this.getVisualizationById(id, ownerId);
    if (!visualization) {
      throw new CustomError('Visualization not found or not owned by user', 404);
    }
    // Handle dataSourceId update if provided, ensure ownership
    if (updateData.dataSourceId !== undefined) {
        if (updateData.dataSourceId === null) {
            visualization.dataSource = null;
            visualization.dataSourceId = null;
        } else {
            const newDataSource = await this.dataSourceRepository.findOne({ where: { id: updateData.dataSourceId } });
            if (!newDataSource || newDataSource.ownerId !== ownerId) {
                throw new CustomError('New Data Source not found or not owned by user', 403);
            }
            visualization.dataSource = newDataSource;
            visualization.dataSourceId = newDataSource.id;
        }
        delete updateData.dataSourceId; // Prevent TypeORM from trying to set id directly after relation is handled
    }

    Object.assign(visualization, updateData);
    await this.visualizationRepository.save(visualization);
    logger.info(`Visualization ${id} updated by user ${ownerId}`);
    return visualization;
  }

  async deleteVisualization(id: string, ownerId: string) {
    const visualization = await this.getVisualizationById(id, ownerId);
    if (!visualization) {
      throw new CustomError('Visualization not found or not owned by user', 404);
    }
    const result = await this.visualizationRepository.delete(id);
    if (result.affected === 0) {
      throw new CustomError('Failed to delete visualization', 500);
    }
    logger.info(`Visualization ${id} deleted by user ${ownerId}`);
    return { message: 'Visualization deleted successfully' };
  }
}

export const visualizationService = new VisualizationService();