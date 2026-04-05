```typescript
import { Repository } from 'typeorm';
import { Alert } from '../entities/Alert.entity';

export class AlertRepository extends Repository<Alert> {
  async findByIdAndMonitorAndUser(alertId: string, monitorId: string, userId: string): Promise<Alert | null> {
    return this.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.monitor', 'monitor')
      .leftJoinAndSelect('monitor.project', 'project')
      .leftJoinAndSelect('project.user', 'user')
      .where('alert.id = :alertId', { alertId })
      .andWhere('monitor.id = :monitorId', { monitorId })
      .andWhere('user.id = :userId', { userId })
      .getOne();
  }

  async findByMonitorIdAndUser(monitorId: string, userId: string): Promise<Alert[]> {
    return this.createQueryBuilder('alert')
      .leftJoinAndSelect('alert.monitor', 'monitor')
      .leftJoinAndSelect('monitor.project', 'project')
      .where('monitor.id = :monitorId', { monitorId })
      .andWhere('project.userId = :userId', { userId })
      .orderBy('alert.createdAt', 'DESC')
      .getMany();
  }
}
```