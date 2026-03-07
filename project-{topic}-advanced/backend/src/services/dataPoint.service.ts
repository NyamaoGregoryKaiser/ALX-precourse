```typescript
import { AppDataSource } from '../data-source';
import { DataPoint } from '../entities/DataPoint';
import { MetricDefinition } from '../entities/MetricDefinition';
import { Service } from '../entities/Service';
import { serviceRepository } from './service.service'; // Assuming serviceRepository is exported from service.service
import { BadRequestError, UnauthorizedError, NotFoundError } from '../middleware/errorHandler.middleware';
import logger from '../utils/logger';
import { databaseQueryDurationSeconds } from '../utils/prometheus';

const dataPointRepository = AppDataSource.getRepository(DataPoint);
const metricDefinitionRepository = AppDataSource.getRepository(MetricDefinition);

export const submitDataPoint = async (
  apiKey: string,
  serviceId: string,
  metricName: string,
  value: number,
  timestamp: Date,
  metadata?: Record<string, any>
): Promise<DataPoint> => {
  const timer = databaseQueryDurationSeconds.labels('submitDataPoint', 'DataPoint').startTimer();
  try {
    // 1. Authenticate service via API key
    const service = await AppDataSource.getRepository(Service).findOneBy({ id: serviceId, apiKey });
    if (!service) {
      throw new UnauthorizedError('Invalid Service ID or API Key.');
    }

    // 2. Find metric definition for the service
    const metricDefinition = await metricDefinitionRepository.findOne({ where: { serviceId, name: metricName } });
    if (!metricDefinition) {
      throw new NotFoundError(`Metric definition '${metricName}' not found for service '${service.name}'.`);
    }

    // 3. Create and save data point
    const newDataPoint = dataPointRepository.create({
      metricDefinitionId: metricDefinition.id,
      metricDefinition,
      value,
      timestamp,
      metadata: metadata ? JSON.stringify(metadata) : null,
    });

    await dataPointRepository.save(newDataPoint);
    logger.debug(`Data point submitted for service ${serviceId}, metric ${metricName}`);
    return newDataPoint;
  } catch (error) {
    logger.error(`Error submitting data point for service ${serviceId}, metric ${metricName}:`, error);
    throw error;
  } finally {
    timer();
  }
};

interface GetMetricDataOptions {
  serviceId: string;
  metricDefinitionId?: string;
  startDate?: Date;
  endDate?: Date;
  interval?: '1h' | '1d' | '7d' | '30d'; // Aggregation interval
  aggregateFunction?: 'avg' | 'min' | 'max' | 'sum' | 'count';
}

export const getMetricData = async (options: GetMetricDataOptions): Promise<any[]> => {
  const { serviceId, metricDefinitionId, startDate, endDate, interval = '1h', aggregateFunction = 'avg' } = options;
  const timer = databaseQueryDurationSeconds.labels('getMetricData', 'DataPoint').startTimer();
  try {
    const queryBuilder = dataPointRepository
      .createQueryBuilder('dataPoint')
      .innerJoinAndSelect('dataPoint.metricDefinition', 'metricDefinition')
      .where('metricDefinition.serviceId = :serviceId', { serviceId });

    if (metricDefinitionId) {
      queryBuilder.andWhere('dataPoint.metricDefinitionId = :metricDefinitionId', { metricDefinitionId });
    }

    if (startDate) {
      queryBuilder.andWhere('dataPoint.timestamp >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder.andWhere('dataPoint.timestamp <= :endDate', { endDate });
    }

    // Determine aggregation interval for SQL
    let dateTruncInterval: string;
    let order: 'ASC' | 'DESC' = 'ASC';
    switch (interval) {
      case '1h':
        dateTruncInterval = 'hour';
        break;
      case '1d':
        dateTruncInterval = 'day';
        break;
      case '7d':
        dateTruncInterval = 'week';
        break;
      case '30d':
        dateTruncInterval = 'month';
        break;
      default:
        dateTruncInterval = 'hour';
    }

    queryBuilder
      .select(`DATE_TRUNC('${dateTruncInterval}', dataPoint.timestamp)`, 'time')
      .addSelect('metricDefinition.name', 'metricName')
      .addSelect('metricDefinition.unit', 'unit')
      .addSelect(`CAST(${aggregateFunction}(dataPoint.value) AS NUMERIC(10,2))`, 'value') // Cast to NUMERIC for clean output
      .groupBy('time')
      .addGroupBy('metricDefinition.name')
      .addGroupBy('metricDefinition.unit')
      .orderBy('time', order);

    const result = await queryBuilder.getRawMany();
    logger.debug(`Fetched aggregated metric data for service ${serviceId}`);
    return result;
  } catch (error) {
    logger.error(`Error getting metric data for service ${serviceId}:`, error);
    throw error;
  } finally {
    timer();
  }
};
```