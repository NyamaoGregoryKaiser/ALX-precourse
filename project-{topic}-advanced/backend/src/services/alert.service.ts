```typescript
import { Alert, AlertCondition, AlertStatus, AlertType } from '../entities/Alert.entity';
import { AlertRepository } from '../repositories/Alert.repository';
import { MonitorRepository } from '../repositories/Monitor.repository';
import { ApiError } from '../utils/api-error';
import { StatusCodes } from 'http-status-codes';
import { Monitor } from '../entities/Monitor.entity';

interface AlertData {
  monitorId: string;
  type: AlertType;
  threshold: number;
  condition: AlertCondition;
  message?: string;
  isActive?: boolean;
  status?: AlertStatus;
}

export class AlertService {
  private alertRepository: AlertRepository;
  private monitorRepository: MonitorRepository;

  constructor(alertRepository: AlertRepository, monitorRepository: MonitorRepository) {
    this.alertRepository = alertRepository;
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

  async getAlertsByMonitorId(monitorId: string, userId: string): Promise<Alert[]> {
    await this.checkMonitorOwnership(monitorId, userId); // Ensure user owns the monitor
    return this.alertRepository.findByMonitorIdAndUser(monitorId, userId);
  }

  async getAlertById(alertId: string, userId: string): Promise<Alert | null> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
      relations: ['monitor', 'monitor.project'],
    });

    if (!alert || alert.monitor.project.userId !== userId) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Alert not found or you do not have access.');
    }
    return alert;
  }

  async createAlert(data: AlertData, userId: string): Promise<Alert> {
    const monitor = await this.checkMonitorOwnership(data.monitorId, userId);

    const newAlert = this.alertRepository.create({
      monitor: monitor,
      type: data.type,
      threshold: data.threshold,
      condition: data.condition,
      message: data.message,
      isActive: data.isActive ?? true,
      status: AlertStatus.OK, // New alerts start with OK status
    });

    return this.alertRepository.save(newAlert);
  }

  async updateAlert(alertId: string, data: Partial<AlertData>, userId: string): Promise<Alert> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
      relations: ['monitor', 'monitor.project'],
    });

    if (!alert || alert.monitor.project.userId !== userId) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Alert not found or you do not have access.');
    }

    // Prevent changing monitorId via update
    if (data.monitorId && data.monitorId !== alert.monitorId) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Cannot change monitor associated with an alert.');
    }

    Object.assign(alert, data);
    return this.alertRepository.save(alert);
  }

  async deleteAlert(alertId: string, userId: string): Promise<void> {
    const alert = await this.alertRepository.findOne({
      where: { id: alertId },
      relations: ['monitor', 'monitor.project'],
    });

    if (!alert || alert.monitor.project.userId !== userId) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Alert not found or you do not have access.');
    }

    await this.alertRepository.remove(alert);
  }
}
```