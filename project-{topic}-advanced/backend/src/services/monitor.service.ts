```typescript
import { Monitor, MonitorMethod, MonitorStatus } from '../entities/Monitor.entity';
import { MonitorRepository } from '../repositories/Monitor.repository';
import { ApiError } from '../utils/api-error';
import { StatusCodes } from 'http-status-codes';
import { AppDataSource } from '../database/data-source';
import { ProjectRepository } from '../repositories/Project.repository';
import { Project } from '../entities/Project.entity';
import { startMonitorScheduler } from '../jobs/monitor-scheduler'; // Import to restart scheduler
import { cacheService } from './cache.service';

interface MonitorData {
  name: string;
  url: string;
  method?: MonitorMethod;
  intervalSeconds?: number;
  status?: MonitorStatus;
  projectId: string;
}

export class MonitorService {
  private monitorRepository: MonitorRepository;
  private projectRepository: ProjectRepository;

  constructor(monitorRepository: MonitorRepository) {
    this.monitorRepository = monitorRepository;
    this.projectRepository = new ProjectRepository(AppDataSource.getRepository(Project));
  }

  async checkProjectOwnership(projectId: string, userId: string): Promise<Project | null> {
    return this.projectRepository.findByIdAndUser(projectId, userId);
  }

  async getAllMonitorsByUserId(userId: string): Promise<Monitor[]> {
    const cachedMonitors = await cacheService.get<Monitor[]>(`user:${userId}:monitors`);
    if (cachedMonitors) {
      return cachedMonitors;
    }

    const monitors = await this.monitorRepository.find({
      relations: ['project'],
      where: { project: { userId: userId } },
      order: { createdAt: 'DESC' },
    });
    await cacheService.set(`user:${userId}:monitors`, monitors);
    return monitors;
  }

  async getMonitorById(monitorId: string, userId: string): Promise<Monitor | null> {
    const cachedMonitor = await cacheService.get<Monitor>(`user:${userId}:monitor:${monitorId}`);
    if (cachedMonitor) {
      return cachedMonitor;
    }

    const monitor = await this.monitorRepository.findOne({
      where: { id: monitorId, project: { userId: userId } },
      relations: ['project'],
    });
    if (monitor) {
        await cacheService.set(`user:${userId}:monitor:${monitorId}`, monitor);
    }
    return monitor;
  }

  async createMonitor(data: MonitorData, userId: string): Promise<Monitor> {
    const project = await this.checkProjectOwnership(data.projectId, userId);
    if (!project) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Project not found or does not belong to you.');
    }

    const newMonitor = this.monitorRepository.create({ ...data, project });
    const savedMonitor = await this.monitorRepository.save(newMonitor);

    await cacheService.del(`user:${userId}:monitors`); // Invalidate list
    startMonitorScheduler(); // Trigger a refresh of the scheduler to pick up new monitor
    return savedMonitor;
  }

  async updateMonitor(monitorId: string, data: Partial<MonitorData>, userId: string): Promise<Monitor> {
    const monitor = await this.getMonitorById(monitorId, userId);

    if (!monitor) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Monitor not found or you do not have access.');
    }

    if (data.projectId && data.projectId !== monitor.projectId) {
      const newProject = await this.checkProjectOwnership(data.projectId, userId);
      if (!newProject) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'New project not found or does not belong to you.');
      }
      monitor.project = newProject; // Update project relation
    }

    Object.assign(monitor, data);
    const updatedMonitor = await this.monitorRepository.save(monitor);

    await cacheService.del(`user:${userId}:monitors`); // Invalidate list
    await cacheService.del(`user:${userId}:monitor:${monitorId}`); // Invalidate specific monitor
    startMonitorScheduler(); // Trigger a refresh of the scheduler to update job for this monitor
    return updatedMonitor;
  }

  async deleteMonitor(monitorId: string, userId: string): Promise<void> {
    const monitor = await this.getMonitorById(monitorId, userId);

    if (!monitor) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Monitor not found or you do not have access.');
    }

    await this.monitorRepository.remove(monitor);
    await cacheService.del(`user:${userId}:monitors`); // Invalidate list
    await cacheService.del(`user:${userId}:monitor:${monitorId}`); // Invalidate specific monitor
    // Alerts and Metrics for this monitor will be deleted via CASCADE, their caches also need invalidation.
    startMonitorScheduler(); // Trigger a refresh of the scheduler to remove job for this monitor
  }
}
```