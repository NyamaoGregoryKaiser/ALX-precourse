```typescript
import { Controller, Get, Param, Patch, Delete, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiBearerAuth('access-token')
@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.VIEWER) // All authenticated users can manage their notifications
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve notifications for the authenticated user' })
  @ApiQuery({ name: 'isRead', required: false, type: Boolean, description: 'Filter by read status (true/false)' })
  @ApiResponse({ status: 200, description: 'List of user notifications.', type: [Notification] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findUserNotifications(
    @Req() req: Request,
    @Param('isRead') isRead?: string, // Query parameter for filtering
  ): Promise<Notification[]> {
    const userId = (req.user as User).id;
    let isReadBool: boolean | undefined = undefined;
    if (isRead !== undefined) {
      isReadBool = isRead === 'true';
    }
    return this.notificationsService.findUserNotifications(userId, isReadBool);
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a specific notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read.', type: Notification })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async markAsRead(
    @Param('id') notificationId: string,
    @Req() req: Request,
  ): Promise<Notification> {
    const userId = (req.user as User).id;
    return this.notificationsService.markAsRead(notificationId, userId);
  }

  @Patch('mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all unread notifications for the user as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async markAllAsRead(@Req() req: Request): Promise<{ affected: number }> {
    const userId = (req.user as User).id;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a specific notification' })
  @ApiResponse({ status: 204, description: 'Notification successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 404, description: 'Notification not found.' })
  async remove(
    @Param('id') notificationId: string,
    @Req() req: Request,
  ): Promise<void> {
    const userId = (req.user as User).id;
    await this.notificationsService.remove(notificationId, userId);
  }
}
```