```typescript
import cron from 'node-cron';
import { env } from '../config';
import logger from '../utils/logger';
import { AppDataSource } from '../database/data-source';
import { Monitor, MonitorMethod, MonitorStatus } from '../entities/Monitor.entity';
import { Metric } from '../entities/Metric.entity';
import { Alert, AlertCondition, AlertStatus, AlertType } from '../entities/Alert.entity';
import { MonitorRepository } from '../repositories/Monitor.repository';
import { MetricRepository } from '../repositories/Metric.repository';
import { AlertRepository } from '../repositories/Alert.repository';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

// --- Monitoring Worker Logic ---
export async function checkMonitor(monitor: Monitor): Promise<void> {
  const startTime = process.hrtime.bigint();
  let responseTimeMs: number | undefined;
  let statusCode: number | undefined;
  let statusText: string | undefined;
  let error: string | undefined;

  logger.debug(`Checking monitor: ${monitor.name} (${monitor.url})`);

  try {
    const requestConfig: AxiosRequestConfig = {
      method: monitor.method,
      url: monitor.url,
      timeout: 10000, // 10 seconds timeout for the request
      validateStatus: () => true, // Resolve all status codes, handle them manually
    };

    const response: AxiosResponse = await axios(requestConfig);
    const endTime = process.hrtime.bigint();
    responseTimeMs = Number(endTime - startTime) / 1_000_000; // Convert nanoseconds to milliseconds

    statusCode = response.status;
    statusText = response.statusText;

    logger.debug(`Monitor ${monitor.name} - Status: ${statusCode}, Response Time: ${responseTimeMs.toFixed(2)}ms`);

  } catch (err: any) {
    const endTime = process.hrtime.bigint();
    responseTimeMs = Number(endTime - startTime) / 1_000_000;
    error = err.message || 'Unknown error';
    logger.error(`Error checking monitor ${monitor.name} (${monitor.url}): ${error}`);
  } finally {
    // Save metric
    const metricRepository = new MetricRepository(AppDataSource.getRepository(Metric));
    const newMetric = metricRepository.create({
      monitorId: monitor.id,
      timestamp: new Date(),
      responseTimeMs,
      statusCode,
      statusText,
      error,
    });
    await metricRepository.save(newMetric);

    // Update monitor's last check time
    const monitorRepo = new MonitorRepository(AppDataSource.getRepository(Monitor));
    monitor.lastCheckAt = new Date();
    await monitorRepo.save(monitor);

    // Evaluate alerts
    await evaluateAlerts(monitor, newMetric);
  }
}

async function evaluateAlerts(monitor: Monitor, latestMetric: Metric): Promise<void> {
  const alertRepository = new AlertRepository(AppDataSource.getRepository(Alert));
  const activeAlerts = await alertRepository.find({ where: { monitorId: monitor.id, isActive: true } });

  for (const alert of activeAlerts) {
    let isConditionMet = false;
    let metricValue: number | undefined;

    if (alert.type === AlertType.RESPONSE_TIME) {
      metricValue = latestMetric.responseTimeMs;
    } else if (alert.type === AlertType.STATUS_CODE) {
      metricValue = latestMetric.statusCode;
    }

    if (metricValue === undefined) {
      // If metric value is null (e.g., connection error), consider it a potential alert condition for status code >= 400
      if (alert.type === AlertType.STATUS_CODE && (alert.condition === AlertCondition.GTE || alert.condition === AlertCondition.GT) && alert.threshold <= 400) {
        isConditionMet = true; // No status code means it's likely an error.
        logger.warn(`Alert for monitor ${monitor.name}: No metric value. Triggering status code alert as a precaution.`);
      } else {
        continue; // Cannot evaluate without a metric value, skip for this alert type
      }
    } else {
      switch (alert.condition) {
        case AlertCondition.GT:
          isConditionMet = metricValue > alert.threshold;
          break;
        case AlertCondition.GTE:
          isConditionMet = metricValue >= alert.threshold;
          break;
        case AlertCondition.LT:
          isConditionMet = metricValue < alert.threshold;
          break;
        case AlertCondition.LTE:
          isConditionMet = metricValue <= alert.threshold;
          break;
        case AlertCondition.EQ:
          isConditionMet = metricValue === alert.threshold;
          break;
        case AlertCondition.NEQ:
          isConditionMet = metricValue !== alert.threshold;
          break;
      }
    }

    if (isConditionMet) {
      if (alert.status !== AlertStatus.ALERT) {
        alert.status = AlertStatus.ALERT;
        alert.lastTriggeredAt = new Date();
        await alertRepository.save(alert);
        logger.warn(`ALERT TRIGGERED for monitor '${monitor.name}': ${alert.message || `Condition met: ${alert.type} ${alert.condition} ${alert.threshold}`}`);
        // TODO: Integrate notification system (email, SMS, Slack, etc.)
      }
    } else {
      if (alert.status === AlertStatus.ALERT) {
        alert.status = AlertStatus.RESOLVED;
        await alertRepository.save(alert);
        logger.info(`ALERT RESOLVED for monitor '${monitor.name}'.`);
        // TODO: Integrate notification system for resolution
      }
      // If status is OK or RESOLVED and condition not met, keep it as OK
      else if (alert.status === AlertStatus.RESOLVED) {
        alert.status = AlertStatus.OK; // Move back to OK if it was resolved and still healthy
        await alertRepository.save(alert);
      }
    }
  }
}

// --- Scheduler Setup ---
export function startMonitorScheduler(): void {
  // Use a map to store cron jobs by monitor ID
  const activeCronJobs = new Map<string, cron.ScheduledTask>();

  const scheduleJobForMonitor = (monitor: Monitor) => {
    // If a job already exists for this monitor, destroy it first to update the schedule
    if (activeCronJobs.has(monitor.id)) {
      activeCronJobs.get(monitor.id)?.stop();
      activeCronJobs.delete(monitor.id);
      logger.debug(`Stopped existing cron job for monitor: ${monitor.name}`);
    }

    // Convert seconds interval to cron string (e.g., 60s -> */1 * * * *)
    const cronExpression = `*/${monitor.intervalSeconds} * * * * *`; // Every X seconds
    // Note: node-cron supports cron string for seconds as well (6 parts)

    logger.info(`Scheduling monitor '${monitor.name}' to run every ${monitor.intervalSeconds} seconds.`);
    const job = cron.schedule(cronExpression, async () => {
      if (monitor.status === MonitorStatus.ACTIVE) {
        await checkMonitor(monitor);
      } else {
        logger.debug(`Monitor ${monitor.name} is paused. Skipping check.`);
      }
    }, {
      scheduled: true,
      timezone: "Etc/UTC" // Use UTC to avoid timezone issues
    });
    activeCronJobs.set(monitor.id, job);
  };

  const initializeScheduler = async () => {
    try {
      const monitorRepository = new MonitorRepository(AppDataSource.getRepository(Monitor));
      const monitors = await monitorRepository.find({ where: { status: MonitorStatus.ACTIVE } });
      logger.info(`Found ${monitors.length} active monitors to schedule.`);

      for (const monitor of monitors) {
        scheduleJobForMonitor(monitor);
      }
    } catch (error) {
      logger.error('Failed to initialize monitor scheduler:', error);
    }
  };

  initializeScheduler(); // Initial run

  // Also, schedule a job to periodically check for new/updated/deleted monitors
  // This interval can be longer, e.g., every 5 minutes.
  cron.schedule(env.MONITOR_CHECK_INTERVAL_CRON, async () => {
    logger.debug('Refreshing monitor schedules...');
    try {
      const monitorRepository = new MonitorRepository(AppDataSource.getRepository(Monitor));
      const currentMonitors = await monitorRepository.find({ withDeleted: false }); // Get all, including paused

      // Identify monitors that need scheduling/rescheduling
      for (const monitor of currentMonitors) {
        if (monitor.status === MonitorStatus.ACTIVE) {
          // Check if monitor is new or its interval has changed or it was paused and is now active
          const currentJob = activeCronJobs.get(monitor.id);
          if (!currentJob || monitor.intervalSeconds !== (monitorRepository as any)._monitorIntervals?.[monitor.id] || monitor.status !== MonitorStatus.ACTIVE) {
             // Storing interval might require a small extension to the repo or a global map.
             // For simplicity, we just reschedule if job isn't there or status changed.
            scheduleJobForMonitor(monitor);
          }
        } else if (monitor.status === MonitorStatus.PAUSED && activeCronJobs.has(monitor.id)) {
          activeCronJobs.get(monitor.id)?.stop();
          activeCronJobs.delete(monitor.id);
          logger.info(`Paused and stopped cron job for monitor: ${monitor.name}`);
        }
      }

      // Identify and remove jobs for deleted monitors
      const monitorIds = new Set(currentMonitors.map(m => m.id));
      for (const monitorId of activeCronJobs.keys()) {
        if (!monitorIds.has(monitorId)) {
          activeCronJobs.get(monitorId)?.stop();
          activeCronJobs.delete(monitorId);
          logger.info(`Stopped and removed cron job for deleted monitor ID: ${monitorId}`);
        }
      }

    } catch (error) {
      logger.error('Error refreshing monitor schedules:', error);
    }
  }, {
    scheduled: true,
    timezone: "Etc/UTC"
  });

  logger.info('Monitor scheduler initialized.');
}
```