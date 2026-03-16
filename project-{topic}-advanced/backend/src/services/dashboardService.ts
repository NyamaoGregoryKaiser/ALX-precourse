import { AppDataSource } from '../db/data-source';
import { Dashboard } from '../db/entities/Dashboard';
import { User } from '../db/entities/User';
import { CustomError } from '../middleware/errorHandler';
import { logger } from '../utils/logger';

class DashboardService {
  private dashboardRepository = AppDataSource.getRepository(Dashboard);
  private userRepository = AppDataSource.getRepository(User);

  async createDashboard(name: string, description: string, ownerId: string, layout: any = {}) {
    const owner = await this.userRepository.findOneBy({ id: ownerId });
    if (!owner) {
      throw new CustomError('Owner user not found', 404);
    }
    const newDashboard = this.dashboardRepository.create({ name, description, owner, layout });
    await this.dashboardRepository.save(newDashboard);
    logger.info(`Dashboard ${newDashboard.id} created by user ${ownerId}`);
    return newDashboard;
  }

  async getAllDashboards(ownerId: string) {
    return this.dashboardRepository.find({ where: { ownerId }, relations: ['owner'] });
  }

  async getDashboardById(id: string, ownerId: string) {
    const dashboard = await this.dashboardRepository.findOne({ where: { id, ownerId }, relations: ['owner', 'visualizations'] });
    if (!dashboard) {
      throw new CustomError('Dashboard not found or not owned by user', 404);
    }
    return dashboard;
  }

  async updateDashboard(id: string, ownerId: string, updateData: Partial<Dashboard>) {
    const dashboard = await this.getDashboardById(id, ownerId);
    if (!dashboard) {
      throw new CustomError('Dashboard not found or not owned by user', 404);
    }
    Object.assign(dashboard, updateData);
    await this.dashboardRepository.save(dashboard);
    logger.info(`Dashboard ${id} updated by user ${ownerId}`);
    return dashboard;
  }

  async deleteDashboard(id: string, ownerId: string) {
    const dashboard = await this.getDashboardById(id, ownerId);
    if (!dashboard) {
      throw new CustomError('Dashboard not found or not owned by user', 404);
    }
    const result = await this.dashboardRepository.delete(id);
    if (result.affected === 0) {
      throw new CustomError('Failed to delete dashboard', 500);
    }
    logger.info(`Dashboard ${id} deleted by user ${ownerId}`);
    return { message: 'Dashboard deleted successfully' };
  }
}

export const dashboardService = new DashboardService();