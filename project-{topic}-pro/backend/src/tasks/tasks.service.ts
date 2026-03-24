```typescript
import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { TaskStatus } from './enums/task-status.enum';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private tasksRepository: Repository<Task>,
    private projectsService: ProjectsService,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async create(projectId: string, createTaskDto: CreateTaskDto, creator: User): Promise<Task> {
    const project = await this.projectsService.findOne(projectId, creator.id); // Ensure project exists and user has access

    let assignee: User | null = null;
    if (createTaskDto.assigneeId) {
      assignee = await this.usersService.findById(createTaskDto.assigneeId);
      if (!assignee) {
        throw new BadRequestException(`Assignee with ID "${createTaskDto.assigneeId}" not found`);
      }
    }

    const task = this.tasksRepository.create({
      ...createTaskDto,
      project: project,
      creator: creator,
      assignee: assignee,
      status: TaskStatus.OPEN, // Default status for new tasks
    });

    const savedTask = await this.tasksRepository.save(task);

    if (assignee && assignee.id !== creator.id) {
      // Notify assignee
      await this.notificationsService.create({
        userId: assignee.id,
        message: `You have been assigned to task "${savedTask.title}" in project "${project.name}".`,
        entityType: 'task',
        entityId: savedTask.id,
      });
    }

    return savedTask;
  }

  async findAllByProject(projectId: string, userId: string): Promise<Task[]> {
    // Ensure user has access to the project first
    await this.projectsService.findOne(projectId, userId);

    return this.tasksRepository.find({
      where: { project: { id: projectId } },
      relations: ['assignee', 'creator', 'project'], // Eager load related entities
    });
  }

  async findOne(id: string, userId: string): Promise<Task> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project', 'project.owner', 'assignee', 'creator', 'comments', 'comments.author'],
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    // Authorization check: User must be project owner, task creator, or task assignee to view
    if (task.project.owner.id !== userId && task.creator.id !== userId && (!task.assignee || task.assignee.id !== userId)) {
      throw new ForbiddenException('You do not have permission to view this task');
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto, userId: string): Promise<Task> {
    const task = await this.findOne(id, userId); // findOne already includes authorization check

    // Additional authorization for specific fields:
    // Only project owner or task creator can reassign/change project
    if (updateTaskDto.assigneeId && updateTaskDto.assigneeId !== task.assignee?.id) {
      if (task.project.owner.id !== userId && task.creator.id !== userId) {
        throw new ForbiddenException('Only project owner or task creator can reassign tasks.');
      }
      const newAssignee = await this.usersService.findById(updateTaskDto.assigneeId);
      if (!newAssignee) {
        throw new BadRequestException(`Assignee with ID "${updateTaskDto.assigneeId}" not found`);
      }
      task.assignee = newAssignee;

      // Notify new assignee
      if (newAssignee.id !== userId) { // Don't notify if user assigns to themselves
        await this.notificationsService.create({
          userId: newAssignee.id,
          message: `You have been assigned to task "${task.title}" in project "${task.project.name}".`,
          entityType: 'task',
          entityId: task.id,
        });
      }
      // Consider notifying old assignee if they were removed
    } else if (updateTaskDto.assigneeId === null) { // Explicitly unassign
      if (task.project.owner.id !== userId && task.creator.id !== userId) {
        throw new ForbiddenException('Only project owner or task creator can unassign tasks.');
      }
      task.assignee = null;
    }

    // A user can only update task status if they are the assignee, creator, or project owner.
    if (updateTaskDto.status && updateTaskDto.status !== task.status) {
      if (task.project.owner.id !== userId && task.creator.id !== userId && task.assignee?.id !== userId) {
        throw new ForbiddenException('Only project owner, task creator, or assignee can change task status.');
      }
    }

    // Apply other updates
    Object.assign(task, updateTaskDto);
    return this.tasksRepository.save(task);
  }

  async remove(id: string, userId: string): Promise<void> {
    const task = await this.tasksRepository.findOne({
      where: { id },
      relations: ['project', 'project.owner', 'creator'], // Need project owner/creator for authorization
    });

    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    // Authorization check: Only project owner or task creator can delete
    if (task.project.owner.id !== userId && task.creator.id !== userId) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    const result = await this.tasksRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Task with ID "${id}" not found`); // Should not happen
    }
  }
}
```