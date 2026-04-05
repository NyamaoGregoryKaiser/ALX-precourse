```typescript
import { Metric } from '../entities/Metric.entity';
import { MetricRepository } from '../repositories/Metric.repository';
import { MonitorRepository } from '../repositories/Monitor.repository';
import { ApiError } from '../utils/api-error';
import { StatusCodes } from 'http-status-codes';
import { cacheService } from './cache.service';
import { Monitor } from '../entities/Monitor.entity';

export class MetricService {
  private metricRepository: MetricRepository;
  private monitorRepository: MonitorRepository;

  constructor(metricRepository: MetricRepository, monitorRepository: MonitorRepository) {
    this.metricRepository = metricRepository;
    this.monitorRepository = monitorRepository;
  }

  private async checkMonitorOwnership(monitorId: string, userId: string): Promise<Monitor> {
    const monitor = await this.monitorRepository.findOne({
      where: { id: monitorId },
      relations: ['project'],
    });

    if (!monitor || monitor.project.userId !== userId) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Monitor not found or you do not have access.');
    }
    return monitor;
  }

  async getMetricsByMonitorId(
    monitorId: string,
    limit: number = 50,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date
  ): Promise<Metric[]> {
    // Ownership check is handled by middleware
    // We could add caching specific to query params, but that might lead to cache explosion.
    // For now, only caching general monitor data, not specific metric queries.
    return this.metricRepository.findByMonitorId(monitorId, limit, offset, startDate, endDate);
  }

  async getMonitorSummary(monitorId: string, interval: string = '24h'): Promise<any> {
    // Ownership check is handled by middleware
    const cacheKey = `monitor:${monitorId}:summary:${interval}`;
    const cachedSummary = await cacheService.get<any>(cacheKey);
    if (cachedSummary) {
      return cachedSummary;
    }

    const summary = await this.metricRepository.getMonitorMetricsSummary(monitorId, interval);
    await cacheService.set(cacheKey, summary);
    return summary;
  }
}
```