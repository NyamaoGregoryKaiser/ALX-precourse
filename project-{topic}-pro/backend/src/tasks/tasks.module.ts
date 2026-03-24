```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { Task } from './entities/task.entity';
import { ProjectsModule } from '../projects/projects.module';
import { UsersModule } from '../users/users.module';
import { NotificationsModule } from '../notifications/notifications.module'; // For task assignment notifications

@Module({
  imports: [
    TypeOrmModule.forFeature([Task]),
    ProjectsModule, // Needed to find projects
    UsersModule,    // Needed to find assignees
    NotificationsModule, // For sending notifications
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
```