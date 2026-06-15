```typescript
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LessThanOrEqual } from 'typeorm';

import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { GetTasksFilterDto } from './dto/get-tasks-filter.dto';
import { Task } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { TaskStatus } from './enum/task-status.enum';
import { CategoriesService } from '../categories/categories.service';
import { CustomLogger } from '../common/logger/custom-logger';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private categoriesService: CategoriesService,
    private readonly logger: CustomLogger,
  ) {}

  /**
   * Creates a new task for the given user.
   * If a categoryId is provided, it links the task to that category,
   * ensuring the category belongs to the same user.
   *
   * @param createTaskDto DTO containing task details.
   * @param user The authenticated user.
   * @returns The created task.
   * @throws NotFoundException if the provided categoryId does not exist or does not belong to the user.
   */
  async createTask(createTaskDto: CreateTaskDto, user: User): Promise<Task> {
    const { title, description, dueDate, categoryId, status, priority } = createTaskDto;

    let category = null;
    if (categoryId) {
      // Ensure the category exists and belongs to the user
      category = await this.categoriesService.getCategoryById(categoryId, user);
      if (!category) {
        throw new NotFoundException(
          `Category with ID "${categoryId}" not found or does not belong to you.`,
        );
      }
    }

    const task = this.tasksRepository.create({
      title,
      description,
      dueDate,
      status: status || TaskStatus.OPEN, // Default to OPEN
      priority: priority || TaskPriority.MEDIUM, // Default to MEDIUM
      user,
      category,
    });

    try {
      await this.tasksRepository.save(task);
      this.logger.log(
        `User ${user.username} created task: ${task.title}`,
        TasksService.name,
      );
      return task;
    } catch (error) {
      this.logger.error(
        `Failed to create task for user ${user.username}. Error: ${error.message}`,
        error.stack,
        TasksService.name,
      );
      throw error;
    }
  }

  /**
   * Retrieves tasks for a specific user, with optional filtering by status, priority, category, or due date.
   *
   * @param filterDto DTO containing filter criteria.
   * @param user The authenticated user.
   * @returns An array of tasks.
   */
  async getTasks(filterDto: GetTasksFilterDto, user: User): Promise<Task[]> {
    const { status, priority, categoryId, search, dueDateBefore } = filterDto;

    const query = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.category', 'category') // Eager load category
      .where('task.userId = :userId', { userId: user.id });

    if (status) {
      query.andWhere('task.status = :status', { status });
    }

    if (priority) {
      query.andWhere('task.priority = :priority', { priority });
    }

    if (categoryId) {
      query.andWhere('task.categoryId = :categoryId', { categoryId });
    }

    if (search) {
      query.andWhere(
        '(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))',
        { search: `%${search}%` },
      );
    }

    if (dueDateBefore) {
      query.andWhere('task.dueDate <= :dueDateBefore', { dueDateBefore });
    }

    query.orderBy('task.createdAt', 'DESC'); // Order by creation date descending

    const tasks = await query.getMany();
    this.logger.debug(
      `User ${user.username} fetched ${tasks.length} tasks with filters: ${JSON.stringify(filterDto)}`,
      TasksService.name,
    );
    return tasks;
  }

  /**
   * Retrieves a single task by its ID for a specific user.
   *
   * @param id The ID of the task.
   * @param user The authenticated user.
   * @returns The found task.
   * @throws NotFoundException if the task is not found or does not belong to the user.
   */
  async getTaskById(id: number, user: User): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id, user: { id: user.id } },
      relations: ['category'], // Eager load category
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found.`);
    }
    this.logger.debug(
      `User ${user.username} fetched task ID: ${id}`,
      TasksService.name,
    );
    return task;
  }

  /**
   * Updates an existing task for a specific user.
   * Allows updating title, description, status, priority, due date, and category.
   *
   * @param id The ID of the task to update.
   * @param updateTaskDto DTO containing updated task data.
   * @param user The authenticated user.
   * @returns The updated task.
   * @throws NotFoundException if the task or (if provided) category is not found or does not belong to the user.
   * @throws BadRequestException if an invalid status or priority is provided.
   */
  async updateTask(
    id: number,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ): Promise<Task> {
    const task = await this.getTaskById(id, user); // Ensures task belongs to user

    const { categoryId, status, priority, ...rest } = updateTaskDto;

    // Handle category update
    if (categoryId !== undefined) {
      if (categoryId === null) {
        // Unassign category
        task.category = null;
      } else {
        // Assign to a new category, ensure it belongs to the user
        const category = await this.categoriesService.getCategoryById(
          categoryId,
          user,
        );
        if (!category) {
          throw new NotFoundException(
            `Category with ID "${categoryId}" not found or does not belong to you.`,
          );
        }
        task.category = category;
      }
    }

    // Validate and update status
    if (status && !(status in TaskStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }
    if (status) {
      task.status = status;
    }

    // Validate and update priority
    if (priority && !(priority in TaskPriority)) {
      throw new BadRequestException(`Invalid priority: ${priority}`);
    }
    if (priority) {
      task.priority = priority;
    }

    // Apply other updates
    Object.assign(task, rest);

    await this.tasksRepository.save(task);
    this.logger.log(
      `User ${user.username} updated task ID: ${id}`,
      TasksService.name,
    );
    return task;
  }

  /**
   * Deletes a task by its ID for a specific user.
   *
   * @param id The ID of the task to delete.
   * @param user The authenticated user.
   * @throws NotFoundException if the task is not found or does not belong to the user.
   */
  async deleteTask(id: number, user: User): Promise<void> {
    const result = await this.tasksRepository.delete({
      id,
      user: { id: user.id },
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID "${id}" not found.`);
    }
    this.logger.log(
      `User ${user.username} deleted task ID: ${id}`,
      TasksService.name,
    );
  }
}
```