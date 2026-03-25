import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { User } from '../users/entities/user.entity';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { TaskStatus } from './enums/task-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { LoggerService } from '../utils/logger';

/**
 * Service responsible for business logic related to Task entities.
 * It handles CRUD operations for tasks and applies authorization rules.
 */
@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private projectsService: ProjectsService,
    private usersService: UsersService,
    private logger: LoggerService,
  ) {}

  /**
   * Creates a new task within a specified project.
   * Ensures the creating user has permission to the project and validates assigned user.
   * @param createTaskDto The DTO containing data for the new task.
   * @param currentUser The authenticated user creating the task.
   * @returns {Promise<Task>} The newly created task entity.
   * @throws {NotFoundException} If the project or assigned user does not exist.
   * @throws {ForbiddenException} If the current user does not have access to the project.
   */
  async create(createTaskDto: CreateTaskDto, currentUser: User): Promise<Task> {
    this.logger.log(`User ${currentUser.username} (ID: ${currentUser.id}) attempting to create task for project ${createTaskDto.projectId}.`);

    const project = await this.projectsService.findOne(
      createTaskDto.projectId,
      currentUser, // Pass currentUser for project ownership check
    );
    if (!project) {
      throw new NotFoundException(
        `Project with ID "${createTaskDto.projectId}" not found.`,
      );
    }

    let assignedToUser: User | null = null;
    if (createTaskDto.assignedToId) {
      assignedToUser = await this.usersService.findOne(
        createTaskDto.assignedToId,
      );
      if (!assignedToUser) {
        throw new NotFoundException(
          `User with ID "${createTaskDto.assignedToId}" not found for assignment.`,
        );
      }
    } else {
      // If no assignedToId is provided, assign to the project owner by default
      assignedToUser = project.owner;
    }

    const newTask = this.tasksRepository.create({
      ...createTaskDto,
      project: project,
      assignedTo: assignedToUser,
      status: createTaskDto.status || TaskStatus.TODO, // Default status
      dueDate: createTaskDto.dueDate ? new Date(createTaskDto.dueDate) : null,
    });

    return this.tasksRepository.save(newTask);
  }

  /**
   * Retrieves all tasks.
   * For ADMINs, all tasks are returned.
   * For other roles, only tasks belonging to projects they own OR tasks assigned to them are returned.
   * @param currentUser The authenticated user.
   * @returns {Promise<Task[]>} A list of tasks.
   */
  async findAll(currentUser: User): Promise<Task[]> {
    this.logger.log(`User ${currentUser.username} (ID: ${currentUser.id}) fetching all tasks.`);
    const queryBuilder = this.tasksRepository
      .createQueryBuilder('task')
      .leftJoinAndSelect('task.project', 'project')
      .leftJoinAndSelect('task.assignedTo', 'assignedTo')
      .leftJoinAndSelect('project.owner', 'projectOwner');

    if (currentUser.roles.includes(UserRole.ADMIN)) {
      // Admin can see all tasks
      return queryBuilder.getMany();
    } else {
      // Regular users see tasks in their owned projects or tasks assigned to them
      queryBuilder.where(
        'project.ownerId = :userId OR assignedTo.id = :userId',
        { userId: currentUser.id },
      );
      return queryBuilder.getMany();
    }
  }

  /**
   * Retrieves a single task by its ID.
   * Ensures the accessing user has permission to the task (project owner, assigned user, or ADMIN).
   * @param id The ID of the task to find.
   * @param currentUser The authenticated user attempting to access.
   * @returns {Promise<Task>} The found task entity.
   * @throws {NotFoundException} If the task is not found.
   * @throws {ForbiddenException} If the user does not have access to the task.
   */
  async findOne(id: string, currentUser: User): Promise<Task> {
    this.logger.log(`User ${currentUser.username} (ID: ${currentUser.id}) fetching task with ID: ${id}.`);
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project', 'assignedTo', 'project.owner'],
    });

    if (!task) {
      this.logger.warn(`Task with ID ${id} not found.`);
      throw new NotFoundException(`Task with ID "${id}" not found.`);
    }

    // Authorization check
    const isOwner = task.project.owner.id === currentUser.id;
    const isAssigned = task.assignedTo?.id === currentUser.id;
    const isAdmin = currentUser.roles.includes(UserRole.ADMIN);

    if (!isOwner && !isAssigned && !isAdmin) {
      this.logger.warn(`User ${currentUser.username} (ID: ${currentUser.id}) forbidden from accessing task ${id}.`);
      throw new ForbiddenException(
        'You do not have permission to access this task.',
      );
    }
    return task;
  }

  /**
   * Updates an existing task's information.
   * Ensures the updating user has permission to the task.
   * @param id The ID of the task to update.
   * @param updateTaskDto The DTO containing the updated task data.
   * @param currentUser The authenticated user attempting to update.
   * @returns {Promise<Task>} The updated task entity.
   * @throws {NotFoundException} If the task, project, or assigned user is not found.
   * @throws {ForbiddenException} If the user does not have permission to update.
   * @throws {BadRequestException} If trying to assign to a non-existent user.
   */
  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    currentUser: User,
  ): Promise<Task> {
    this.logger.log(`User ${currentUser.username} (ID: ${currentUser.id}) attempting to update task with ID: ${id}.`);

    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project', 'assignedTo', 'project.owner'],
    });

    if (!task) {
      this.logger.warn(`Task with ID ${id} not found for update.`);
      throw new NotFoundException(`Task with ID "${id}" not found.`);
    }

    // Authorization check: Only project owner, assigned user, or ADMIN can update
    const isOwner = task.project.owner.id === currentUser.id;
    const isAssigned = task.assignedTo?.id === currentUser.id;
    const isAdmin = currentUser.roles.includes(UserRole.ADMIN);

    if (!isOwner && !isAssigned && !isAdmin) {
      this.logger.warn(`User ${currentUser.username} (ID: ${currentUser.id}) forbidden from updating task ${id}.`);
      throw new ForbiddenException(
        'You do not have permission to update this task.',
      );
    }

    // Handle project change
    if (updateTaskDto.projectId && updateTaskDto.projectId !== task.project.id) {
      const newProject = await this.projectsService.findOne(
        updateTaskDto.projectId,
        currentUser, // Check if current user has access to the new project
      );
      if (!newProject) {
        throw new NotFoundException(
          `New project with ID "${updateTaskDto.projectId}" not found.`,
        );
      }
      task.project = newProject;
    }

    // Handle assigned user change
    if (updateTaskDto.assignedToId && updateTaskDto.assignedToId !== task.assignedTo?.id) {
      const newAssignedUser = await this.usersService.findOne(
        updateTaskDto.assignedToId,
      );
      if (!newAssignedUser) {
        throw new BadRequestException(
          `User with ID "${updateTaskDto.assignedToId}" not found for assignment.`,
        );
      }
      task.assignedTo = newAssignedUser;
    }

    // Update due date
    if (updateTaskDto.dueDate) {
      task.dueDate = new Date(updateTaskDto.dueDate);
    }

    // Merge other scalar properties
    this.tasksRepository.merge(task, updateTaskDto);
    const updatedTask = await this.tasksRepository.save(task);

    this.logger.log(`Task with ID ${id} updated successfully.`);
    return updatedTask;
  }

  /**
   * Deletes a task from the database.
   * Ensures the deleting user has permission to the task.
   * @param id The ID of the task to delete.
   * @param currentUser The authenticated user attempting to delete.
   * @returns {Promise<void>}
   * @throws {NotFoundException} If the task is not found.
   * @throws {ForbiddenException} If the user does not have permission to delete.
   */
  async remove(id: string, currentUser: User): Promise<void> {
    this.logger.log(`User ${currentUser.username} (ID: ${currentUser.id}) attempting to remove task with ID: ${id}.`);

    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project', 'project.owner'],
    });

    if (!task) {
      this.logger.warn(`Task with ID ${id} not found for deletion.`);
      throw new NotFoundException(`Task with ID "${id}" not found.`);
    }

    // Authorization check: Only project owner or ADMIN can delete
    const isOwner = task.project.owner.id === currentUser.id;
    const isAdmin = currentUser.roles.includes(UserRole.ADMIN);

    if (!isOwner && !isAdmin) {
      this.logger.warn(`User ${currentUser.username} (ID: ${currentUser.id}) forbidden from deleting task ${id}.`);
      throw new ForbiddenException(
        'You do not have permission to delete this task.',
      );
    }

    await this.tasksRepository.remove(task);
    this.logger.log(`Task with ID ${id} removed successfully.`);
  }
}