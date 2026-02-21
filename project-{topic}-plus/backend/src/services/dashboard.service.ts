```typescript
import { AppDataSource } from '../dataSource';
import { Dashboard } from '../entities/Dashboard';
import { AppError } from '../utils/appError';
import { cacheService } from './cache.service';
import { logger } from '../utils/logger';

const dashboardRepository = AppDataSource.getRepository(Dashboard);

export const createDashboard = async (userId: string, data: Partial<Dashboard>): Promise<Dashboard> => {
  const newDashboard = dashboardRepository.create({ ...data, userId });
  try {
    const savedDashboard = await dashboardRepository.save(newDashboard);
    await cacheService.del(`user:${userId}:dashboards`); // Invalidate dashboard list cache
    return savedDashboard;
  } catch (error: any) {
    logger.error(`Failed to create dashboard: ${error.message}`, { userId, data, error });
    throw new AppError('Failed to create dashboard', 500);
  }
};

export const getAllDashboards = async (userId: string): Promise<Dashboard[]> => {
  const cacheKey = `user:${userId}:dashboards`;
  const cachedData = await cacheService.get<Dashboard[]>(cacheKey);
  if (cachedData) {
    logger.info(`Serving dashboards for user ${userId} from cache.`);
    return cachedData;
  }

  try {
    // Load charts associated with each dashboard for a comprehensive view
    const dashboards = await dashboardRepository.find({
      where: { userId },
      relations: ['charts'], // Eager load charts for each dashboard
    });
    await cacheService.set(cacheKey, dashboards, 60 * 5); // Cache for 5 minutes
    return dashboards;
  } catch (error: any) {
    logger.error(`Failed to get all dashboards: ${error.message}`, { userId, error });
    throw new AppError('Failed to retrieve dashboards', 500);
  }
};

export const getDashboardById = async (userId: string, id: string): Promise<Dashboard> => {
  const cacheKey = `dashboard:${id}:full`;
  const cachedData = await cacheService.get<Dashboard>(cacheKey);
  if (cachedData) {
    logger.info(`Serving dashboard ${id} from cache.`);
    return cachedData;
  }

  const dashboard = await dashboardRepository.findOne({
    where: { id, userId },
    relations: ['charts', 'charts.dataSource'], // Load charts and their data sources
  });

  if (!dashboard) {
    throw new AppError('Dashboard not found or you do not have access', 404);
  }
  await cacheService.set(cacheKey, dashboard, 60 * 10); // Cache for 10 minutes
  return dashboard;
};

export const updateDashboard = async (userId: string, id: string, data: Partial<Dashboard>): Promise<Dashboard> => {
  const dashboard = await getDashboardById(userId, id); // Includes ownership check
  dashboardRepository.merge(dashboard, data);
  try {
    const updatedDashboard = await dashboardRepository.save(dashboard);
    await cacheService.del(`user:${userId}:dashboards`); // Invalidate list cache
    await cacheService.del(`dashboard:${id}:full`); // Invalidate specific dashboard cache
    return updatedDashboard;
  } catch (error: any) {
    logger.error(`Failed to update dashboard: ${error.message}`, { userId, id, data, error });
    throw new AppError('Failed to update dashboard', 500);
  }
};

export const deleteDashboard = async (userId: string, id: string): Promise<void> => {
  const dashboard = await getDashboardById(userId, id); // Includes ownership check
  try {
    await dashboardRepository.remove(dashboard);
    await cacheService.del(`user:${userId}:dashboards`); // Invalidate list cache
    await cacheService.del(`dashboard:${id}:full`); // Invalidate specific dashboard cache
  } catch (error: any) {
    logger.error(`Failed to delete dashboard: ${error.message}`, { userId, id, error });
    throw new AppError('Failed to delete dashboard', 500);
  }
};
```