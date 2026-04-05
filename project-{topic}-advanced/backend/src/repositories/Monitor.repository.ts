```typescript
import { Repository } from 'typeorm';
import { Monitor, MonitorStatus } from '../entities/Monitor.entity';

export class MonitorRepository extends Repository<Monitor> {
  async findByIdAndProjectAndUser(monitorId: string, projectId: string, userId: string): Promise<Monitor | null> {
    return this.createQueryBuilder('monitor')
      .leftJoinAndSelect('monitor.project', 'project')
      .leftJoinAndSelect('project.user', 'user')
      .where('monitor.id = :monitorId', { monitorId })
      .andWhere('project.id = :projectId', { projectId })
      .andWhere('user.id = :userId', { userId })
      .getOne();
  }

  async findByProjectIdAndUser(projectId: string, userId: string): Promise<Monitor[]> {
    return this.createQueryBuilder('monitor')
      .leftJoinAndSelect('monitor.project', 'project')
      .where('project.id = :projectId', { projectId })
      .andWhere('project.userId = :userId', { userId })
      .orderBy('monitor.createdAt', 'DESC')
      .getMany();
  }

  async findActiveMonitors(): Promise<Monitor[]> {
    return this.find({
      where: { status: MonitorStatus.ACTIVE },
    });
  }
}
```