```typescript
import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UseInterceptors } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, CacheManager } from '../common/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Request } from 'express';
import { User } from '../users/entities/user.entity';
import { Task } from './entities/task.entity';
import { CacheInterceptor } from '../common/interceptors/cache.interceptor';
import { ThrottlerGuard } from '@nestjs/throttler';

@ApiBearerAuth('access-token')
@ApiTags('tasks')
@Controller('projects/:projectId/tasks') // Nested resource: tasks belong to a project
@UseGuards(JwtAuthGuard, RolesGuard, ThrottlerGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @Roles(UserRole.USER, UserRole.ADMIN) // Project owner or admin can create tasks
  @UseInterceptors(CacheInterceptor) // Invalidate cache on creation
  @CacheManager('tasks_list') // Key prefix to invalidate related caches
  @ApiOperation({ summary: 'Create a new task for a specific project' })
  @ApiResponse({ status: 201, description: 'The task has been successfully created.', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not project owner/admin).' })
  @ApiResponse({ status: 404, description: 'Project not found.' })
  async create(
    @Param('projectId') projectId: string,
    @Body() createTaskDto: CreateTaskDto,
    @Req() req: Request,
  ): Promise<Task> {
    const creator = req.user as User;
    return this.tasksService.create(projectId, createTaskDto, creator);
  }

  @Get()
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.VIEWER) // Any authenticated user with project access can view tasks
  @UseInterceptors(CacheInterceptor) // Cache task list
  @CacheManager('tasks_list', 30) // Cache for 30 seconds
  @ApiOperation({ summary: 'Retrieve all tasks for a specific project' })
  @ApiResponse({ status: 200, description: 'List of tasks for the project.', type: [Task] })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not project owner/member).' })
  async findAllByProject(
    @Param('projectId') projectId: string,
    @Req() req: Request,
  ): Promise<Task[]> {
    const userId = (req.user as User).id;
    return this.tasksService.findAllByProject(projectId, userId);
  }

  @Get(':id')
  @Roles(UserRole.USER, UserRole.ADMIN, UserRole.VIEWER) // Any authenticated user with task/project access can view a task
  @ApiOperation({ summary: 'Retrieve a task by ID within a project' })
  @ApiResponse({ status: 200, description: 'The found task.', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not authorized to view task).' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async findOne(@Param('id') id: string, @Req() req: Request): Promise<Task> {
    const userId = (req.user as User).id;
    return this.tasksService.findOne(id, userId);
  }

  @Patch(':id')
  @Roles(UserRole.USER, UserRole.ADMIN) // Project owner, task creator, or assignee can update
  @UseInterceptors(CacheInterceptor) // Invalidate cache on update
  @CacheManager('tasks_list') // Key prefix to invalidate related caches
  @ApiOperation({ summary: 'Update a task by ID within a project' })
  @ApiResponse({ status: 200, description: 'The task has been successfully updated.', type: Task })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not authorized to update task).' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Req() req: Request,
  ): Promise<Task> {
    const userId = (req.user as User).id;
    return this.tasksService.update(id, updateTaskDto, userId);
  }

  @Delete(':id')
  @Roles(UserRole.USER, UserRole.ADMIN) // Only project owner or task creator can delete
  @UseInterceptors(CacheInterceptor) // Invalidate cache on delete
  @CacheManager('tasks_list') // Key prefix to invalidate related caches
  @ApiOperation({ summary: 'Delete a task by ID within a project' })
  @ApiResponse({ status: 204, description: 'The task has been successfully deleted.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden (not authorized to delete task).' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  async remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const userId = (req.user as User).id;
    await this.tasksService.remove(id, userId);
  }
}
```