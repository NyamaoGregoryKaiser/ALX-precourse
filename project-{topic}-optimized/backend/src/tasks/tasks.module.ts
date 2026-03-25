import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { ProjectsModule } from '../projects/projects.module'; // Required to link tasks to projects
import { UsersModule } from '../users/users.module'; // Required to link tasks to assigned users
import { AuthModule } from '../auth/auth.module'; // Required for JWT authentication

/**
 * TasksModule handles all operations related to task entities.
 * It registers the Task entity with TypeORM and provides the TasksService and TasksController.
 * It depends on ProjectsModule (for project association), UsersModule (for assigned users),
 * and AuthModule (for authentication/authorization).
 */
@Module({
  imports: [
    // Register the Task entity with TypeORM, making the TaskRepository available
    TypeOrmModule.forFeature([Task]),
    ProjectsModule, // Needed to ensure tasks are associated with valid projects
    UsersModule, // Needed to validate users assigned to tasks
    AuthModule, // Needed for JWT authentication guards
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService], // Export TasksService if other modules need to interact with tasks
})
export class TasksModule {}