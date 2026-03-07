```typescript
import { AppDataSource } from '../data-source';
import { MetricDefinition, MetricType } from '../entities/MetricDefinition';
import { Service } from '../entities/Service';
import { BadRequestError, NotFoundError, ForbiddenError } from '../middleware/errorHandler.middleware';
import { UserRole } from '../entities/User';
import logger from '../utils/logger';

const metricDefinitionRepository = AppDataSource.getRepository(MetricDefinition);
const serviceRepository = AppDataSource.getRepository(Service);

export const createMetricDefinition = async (
  serviceId: string,
  name: string,
  type: MetricType,
  unit: string | undefined,
  thresholds: any,
  userId: string,
  roles: UserRole[]
): Promise<MetricDefinition> => {
  const service = await serviceRepository.findOneBy({ id: serviceId });
  if (!service) {
    throw new NotFoundError('Service not found.');
  }

  // Check ownership
  if (!roles.includes(UserRole.ADMIN) && service.userId !== userId) {
    throw new ForbiddenError('You do not have permission to define metrics for this service.');
  }

  const existingMetric = await metricDefinitionRepository.findOne({ where: { serviceId, name } });
  if (existingMetric) {
    throw new BadRequestError('A metric with this name already exists for this service.');
  }

  const newMetric = metricDefinitionRepository.create({
    serviceId,
    service,
    name,
    type,
    unit,
    thresholds: thresholds ? JSON.stringify(thresholds) : null,
  });

  await metricDefinitionRepository.save(newMetric);
  logger.info(`Metric definition created: ${newMetric.name} (ID: ${newMetric.id}) for service ${serviceId}`);
  return newMetric;
};

export const getMetricDefinitionsByService = async (
  serviceId: string,
  userId: string,
  roles: UserRole[]
): Promise<MetricDefinition[]> => {
  const service = await serviceRepository.findOneBy({ id: serviceId });
  if (!service) {
    throw new NotFoundError('Service not found.');
  }

  // Check ownership
  if (!roles.includes(UserRole.ADMIN) && service.userId !== userId) {
    throw new ForbiddenError('You do not have permission to view metrics for this service.');
  }

  return metricDefinitionRepository.find({ where: { serviceId } });
};

export const getMetricDefinitionById = async (
  metricId: string,
  userId: string,
  roles: UserRole[]
): Promise<MetricDefinition> => {
  const metric = await metricDefinitionRepository.findOne({
    where: { id: metricId },
    relations: ['service'], // Load service to check ownership
  });

  if (!metric) {
    throw new NotFoundError('Metric definition not found.');
  }

  // Check ownership
  if (!roles.includes(UserRole.ADMIN) && metric.service.userId !== userId) {
    throw new ForbiddenError('You do not have permission to access this metric definition.');
  }

  return metric;
};

export const updateMetricDefinition = async (
  metricId: string,
  userId: string,
  roles: UserRole[],
  name?: string,
  type?: MetricType,
  unit?: string,
  thresholds?: any
): Promise<MetricDefinition> => {
  const metric = await getMetricDefinitionById(metricId, userId, roles); // Re-uses permission check

  if (name && name !== metric.name) {
    const existingMetric = await metricDefinitionRepository.findOne({
      where: { serviceId: metric.serviceId, name },
    });
    if (existingMetric && existingMetric.id !== metricId) {
      throw new BadRequestError('A metric with this name already exists for this service.');
    }
    metric.name = name;
  }
  if (type) {
    metric.type = type;
  }
  if (unit !== undefined) {
    metric.unit = unit;
  }
  if (thresholds !== undefined) {
    metric.thresholds = thresholds ? JSON.stringify(thresholds) : null;
  }

  await metricDefinitionRepository.save(metric);
  logger.info(`Metric definition updated: ${metric.name} (ID: ${metric.id})`);
  return metric;
};

export const deleteMetricDefinition = async (
  metricId: string,
  userId: string,
  roles: UserRole[]
): Promise<void> => {
  const metric = await getMetricDefinitionById(metricId, userId, roles); // Re-uses permission check
  await metricDefinitionRepository.remove(metric);
  logger.info(`Metric definition deleted: ${metric.name} (ID: ${metric.id})`);
};
```