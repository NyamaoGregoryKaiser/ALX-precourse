import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/user-role.enum';
import { Task } from './entities/task.entity';
import { ThrottlerGuard } from '@nestjs/throttler';
import { TaskStatus } from './enums/task-status.enum';

/**
 * TasksController handles all API endpoints for managing tasks.
 * All endpoints require authentication and are protected by JWT.
 * Specific endpoints might further restrict access based on user roles and task ownership/assignment.
 */
@ApiTags('Tasks')
@ApiBearerAuth('JWT-auth') // All endpoints in this controller require JWT authentication
@UseGuards(JwtAuthGuard, ThrottlerGuard) // Apply JWT Auth and Rate Limiting globally for this controller
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  /**
   * Creates a new task. The task must belong to an existing project.
   * The authenticated user must have access to the project.
   * @param createTaskDto The DTO containing the new task's data.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Task>} The created task.
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER) // These roles can create tasks
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Create a new task',
    description:
      'Creates a new task within a specified project. The current user must have access to the project.',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully.',
    type: Task,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or project/user not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient role or project access.' })
  @ApiResponse({ status: 404, description: 'Project or assigned user not found.' })
  async create(
    @Body() createTaskDto: CreateTaskDto,
    @Request() req: any,
  ): Promise<Task> {
    return this.tasksService.create(createTaskDto, req.user);
  }

  /**
   * Retrieves a list of tasks.
   * ADMINs can see all tasks. Other users see tasks in their owned projects or tasks assigned to them.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Task[]>} A list of tasks accessible by the user.
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.ANALYST) // All authenticated roles can list tasks
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get all tasks accessible by the user',
    description:
      'Admins see all tasks. Other roles see tasks in their owned projects or tasks assigned to them.',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter tasks by project ID',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: TaskStatus,
    description: 'Filter tasks by status',
  })
  @ApiResponse({
    status: 200,
    description: 'List of tasks retrieved successfully.',
    type: [Task],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async findAll(@Request() req: any): Promise<Task[]> {
    // Basic filtering logic can be added here or within the service
    // For simplicity, directly calling service.findAll which handles role-based filtering
    return this.tasksService.findAll(req.user);
  }

  /**
   * Retrieves a single task by its ID.
   * Access is restricted to the project owner, assigned user, or ADMINs.
   * @param id The ID of the task to retrieve.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Task>} The task details.
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER, UserRole.ANALYST) // All authenticated roles can view, but service applies granular checks
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Get a task by ID',
    description: 'Retrieves details of a specific task by its ID. Requires project ownership, task assignment, or Admin role.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the task', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Task retrieved successfully.',
    type: Task,
  })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient access to this task.' })
  async findOne(@Param('id') id: string, @Request() req: any): Promise<Task> {
    return this.tasksService.findOne(id, req.user);
  }

  /**
   * Updates an existing task's details.
   * Only the project owner, assigned user, or ADMINs can update a task.
   * @param id The ID of the task to update.
   * @param updateTaskDto The DTO containing the updated task data.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<Task>} The updated task.
   */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER) // These roles can update, service checks ownership/assignment
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Update a task',
    description: 'Updates details of an existing task by its ID. Requires project ownership, task assignment, or Admin role.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the task', type: 'string' })
  @ApiResponse({
    status: 200,
    description: 'Task updated successfully.',
    type: Task,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or project/user not found.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient access to this task.' })
  async update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @Request() req: any,
  ): Promise<Task> {
    return this.tasksService.update(id, updateTaskDto, req.user);
  }

  /**
   * Deletes a task.
   * Only the project owner or ADMINs can delete a task.
   * @param id The ID of the task to delete.
   * @param req The request object, containing the authenticated user's details.
   * @returns {Promise<void>}
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.USER) // These roles can delete, service checks ownership
  @UseGuards(RolesGuard)
  @ApiOperation({
    summary: 'Delete a task',
    description: 'Deletes a task by its ID. Requires project ownership or Admin role.',
  })
  @ApiParam({ name: 'id', description: 'The ID of the task', type: 'string' })
  @ApiResponse({ status: 204, description: 'Task deleted successfully.' })
  @ApiResponse({ status: 404, description: 'Task not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden: Insufficient access to this task.' })
  async remove(@Param('id') id: string, @Request() req: any): Promise<void> {
    await this.tasksService.remove(id, req.user);
  }
}