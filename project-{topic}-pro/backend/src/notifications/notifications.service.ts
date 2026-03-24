```typescript
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  // This method is typically called by other services (e.g., TasksService)
  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      user: { id: createNotificationDto.userId } as User, // Assign user by ID
      isRead: false, // Default to unread
    });
    return this.notificationsRepository.save(notification);
  }

  async findUserNotifications(userId: string, isRead?: boolean): Promise<Notification[]> {
    const whereClause: any = { user: { id: userId } };
    if (isRead !== undefined) {
      whereClause.isRead = isRead;
    }

    return this.notificationsRepository.find({
      where: whereClause,
      order: { createdAt: 'DESC' },
      take: 20, // Limit to recent notifications
    });
  }

  async markAsRead(notificationId: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id: notificationId, user: { id: userId } },
    });

    if (!notification) {
      throw new NotFoundException(`Notification with ID "${notificationId}" for user "${userId}" not found.`);
    }

    if (notification.isRead) {
      return notification; // Already read
    }

    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notificationsRepository.update(
      { user: { id: userId }, isRead: false },
      { isRead: true },
    );
    return { affected: result.affected || 0 };
  }

  async remove(notificationId: string, userId: string): Promise<void> {
    const result = await this.notificationsRepository.delete({ id: notificationId, user: { id: userId } });
    if (result.affected === 0) {
      throw new NotFoundException(`Notification with ID "${notificationId}" for user "${userId}" not found.`);
    }
  }
}
```