```typescript
import { Repository, Between } from 'typeorm';
import { Metric } from '../entities/Metric.entity';

export class MetricRepository extends Repository<Metric> {
  async findByMonitorId(
    monitorId: string,
    limit: number = 50,
    offset: number = 0,
    startDate?: Date,
    endDate?: Date
  ): Promise<Metric[]> {
    const whereClause: any = { monitorId };
    if (startDate && endDate) {
      whereClause.timestamp = Between(startDate, endDate);
    } else if (startDate) {
      whereClause.timestamp = (timestamp: Date) => `timestamp >= '${startDate.toISOString()}'`;
    } else if (endDate) {
      whereClause.timestamp = (timestamp: Date) => `timestamp <= '${endDate.toISOString()}'`;
    }

    return this.find({
      where: whereClause,
      order: { timestamp: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getMonitorMetricsSummary(monitorId: string, interval: string = '24h'): Promise<any> {
    let intervalClause = '';
    const now = new Date();
    let startDate = new Date();

    // Parse interval (e.g., '24h', '7d', '30d')
    const unit = interval.slice(-1);
    const value = parseInt(interval.slice(0, -1), 10);

    if (isNaN(value)) {
      throw new Error('Invalid interval format. Use like "24h" or "7d".');
    }

    switch (unit) {
      case 'h':
        startDate.setHours(now.getHours() - value);
        break;
      case 'd':
        startDate.setDate(now.getDate() - value);
        break;
      case 'm': // Months
        startDate.setMonth(now.getMonth() - value);
        break;
      default:
        throw new Error('Unsupported interval unit. Use "h", "d", or "m".');
    }

    intervalClause = `WHERE "monitor_id" = '${monitorId}' AND "timestamp" >= '${startDate.toISOString()}'`;

    const rawQuery = `
      SELECT
          COUNT(id) AS "totalChecks",
          COUNT(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 END) AS "successfulChecks",
          COUNT(CASE WHEN status_code >= 400 OR error IS NOT NULL THEN 1 END) AS "failedChecks",
          COALESCE(AVG(response_time_ms), 0)::numeric(10,2) AS "averageResponseTimeMs",
          COALESCE(MIN(response_time_ms), 0) AS "minResponseTimeMs",
          COALESCE(MAX(response_time_ms), 0) AS "maxResponseTimeMs",
          json_object_agg(status_code::text, status_code_count) FILTER (WHERE status_code IS NOT NULL) AS "statusCodeCounts"
      FROM (
          SELECT
              id, response_time_ms, status_code, error
          FROM metrics
          ${intervalClause}
      ) AS filtered_metrics
      LEFT JOIN (
          SELECT
              status_code, COUNT(status_code) AS status_code_count
          FROM metrics
          ${intervalClause}
          GROUP BY status_code
      ) AS status_counts ON filtered_metrics.status_code = status_counts.status_code
      GROUP BY filtered_metrics.monitor_id
    `;

    const result = await this.query(rawQuery);

    if (result.length === 0) {
      return {
        monitorId,
        totalChecks: 0,
        successfulChecks: 0,
        failedChecks: 0,
        uptimePercentage: 100,
        averageResponseTimeMs: 0,
        minResponseTimeMs: 0,
        maxResponseTimeMs: 0,
        statusCodeCounts: {},
      };
    }

    const summary = result[0];
    const totalChecks = parseInt(summary.totalChecks, 10);
    const successfulChecks = parseInt(summary.successfulChecks, 10);
    const failedChecks = parseInt(summary.failedChecks, 10);

    const uptimePercentage = totalChecks > 0
      ? parseFloat(((successfulChecks / totalChecks) * 100).toFixed(2))
      : 100; // If no checks, assume 100% uptime

    return {
      monitorId,
      totalChecks,
      successfulChecks,
      failedChecks,
      uptimePercentage,
      averageResponseTimeMs: parseFloat(summary.averageResponseTimeMs),
      minResponseTimeMs: parseInt(summary.minResponseTimeMs, 10),
      maxResponseTimeMs: parseInt(summary.maxResponseTimeMs, 10),
      statusCodeCounts: summary.statusCodeCounts || {},
    };
  }
}
```