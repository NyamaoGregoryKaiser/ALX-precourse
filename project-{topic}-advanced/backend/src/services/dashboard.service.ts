```typescript
import { AppDataSource } from '../data-source';
import { Service } from '../entities/Service';
import { MetricDefinition } from '../entities/MetricDefinition';
import { DataPoint } from '../entities/DataPoint';
import { UserRole } from '../entities/User';
import { ForbiddenError, NotFoundError } from '../middleware/errorHandler.middleware';
import { getMetricData } from './dataPoint.service';
import logger from '../utils/logger';

const serviceRepository = AppDataSource.getRepository(Service);
const metricDefinitionRepository = AppDataSource.getRepository(MetricDefinition);

export interface ServiceDashboardData {
  service: Service;
  metrics: {
    definition: MetricDefinition;
    latestValue: number | null;
    historicalData: any[];
  }[];
}

/**
 * Retrieves comprehensive dashboard data for a specific service.
 * Includes service details, metric definitions, latest data points, and historical aggregated data.
 */
export const getServiceDashboardData = async (
  serviceId: string,
  userId: string,
  roles: UserRole[],
  options?: {
    timeRange?: string; // e.g., '24h', '7d', '30d'
    interval?: '1h' | '1d' | '7d' | '30d'; // Aggregation interval
    aggregateFunction?: 'avg' | 'min' | 'max' | 'sum' | 'count';
  }
): Promise<ServiceDashboardData> => {
  const { timeRange = '24h', interval = '1h', aggregateFunction = 'avg' } = options || {};

  // 1. Fetch service and check permissions
  const service = await serviceRepository.findOneBy({ id: serviceId });
  if (!service) {
    throw new NotFoundError('Service not found.');
  }
  if (!roles.includes(UserRole.ADMIN) && service.userId !== userId) {
    throw new ForbiddenError('You do not have permission to view this service dashboard.');
  }

  // 2. Fetch all metric definitions for this service
  const metricDefinitions = await metricDefinitionRepository.find({ where: { serviceId } });

  const dashboardMetrics: ServiceDashboardData['metrics'] = [];

  // Determine date range for historical data
  const endDate = new Date();
  let startDate = new Date();
  switch (timeRange) {
    case '1h': startDate.setHours(endDate.getHours() - 1); break;
    case '24h': startDate.setHours(endDate.getHours() - 24); break;
    case '7d': startDate.setDate(endDate.getDate() - 7); break;
    case '30d': startDate.setDate(endDate.getDate() - 30); break;
    default: startDate.setHours(endDate.getHours() - 24); break; // Default to 24 hours
  }

  // 3. For each metric, get latest value and historical aggregated data
  for (const definition of metricDefinitions) {
    // Get latest data point for a quick overview
    const latestDataPoint = await AppDataSource.getRepository(DataPoint).findOne({
      where: { metricDefinitionId: definition.id },
      order: { timestamp: 'DESC' },
    });

    // Get historical aggregated data
    const historicalData = await getMetricData({
      serviceId: service.id,
      metricDefinitionId: definition.id,
      startDate,
      endDate,
      interval,
      aggregateFunction,
    });

    dashboardMetrics.push({
      definition,
      latestValue: latestDataPoint ? latestDataPoint.value : null,
      historicalData,
    });
  }

  logger.info(`Dashboard data fetched for service ${serviceId} by user ${userId}`);
  return {
    service,
    metrics: dashboardMetrics,
  };
};

/**
 * Retrieves a summary of all services with their basic metrics for a global dashboard.
 */
export const getGlobalDashboardSummary = async (userId: string, roles: UserRole[]): Promise<any[]> => {
  let services: Service[];
  if (roles.includes(UserRole.ADMIN)) {
    services = await serviceRepository.find();
  } else {
    services = await serviceRepository.find({ where: { userId } });
  }

  const summary = await Promise.all(
    services.map(async (service) => {
      const metricDefs = await metricDefinitionRepository.find({ where: { serviceId: service.id } });
      const metricSummaries = await Promise.all(
        metricDefs.map(async (def) => {
          const latestPoint = await AppDataSource.getRepository(DataPoint).findOne({
            where: { metricDefinitionId: def.id },
            order: { timestamp: 'DESC' },
            select: ['value'], // Only select value for performance
          });
          return {
            metricName: def.name,
            metricType: def.type,
            unit: def.unit,
            latestValue: latestPoint ? latestPoint.value : null,
          };
        })
      );

      return {
        id: service.id,
        name: service.name,
        description: service.description,
        metricCount: metricDefs.length,
        metricsSummary: metricSummaries,
        createdAt: service.createdAt,
      };
    })
  );

  logger.info(`Global dashboard summary fetched for user ${userId}`);
  return summary;
};
```