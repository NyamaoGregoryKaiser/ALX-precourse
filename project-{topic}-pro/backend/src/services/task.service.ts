```typescript
import { getRepository } from 'typeorm';
import { Task, TaskStatus, TaskPriority } from '@models/Task';
import { Project } from '@models/Project';
import { User, UserRole } from '@models/User';
import AppError, { ErrorType } from '@utils/AppError';
import logger from '@config/logger';

interface CreateTaskData {
  title: string;
  description: string;
  projectId: string;
  assignedToId?: string | null;
  dueDate: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
}

interface UpdateTaskData {
  title?: string;
  description?: string;
  assignedToId?: string | null;
  dueDate?: Date;
  status?: TaskStatus;
  priority?: TaskPriority;
}

class TaskService {
  private taskRepository = getRepository(Task);
  private projectRepository = getRepository(Project);
  private userRepository = getRepository(User);

  async createTask(taskData: CreateTaskData, creatorId: string, creatorRole: UserRole): Promise<Task> {
    const project = await this.projectRepository.findOne({ where: { id: taskData.projectId }, relations: ['owner'] });
    if (!project) {
      logger.warn(`Task creation failed: Project with ID ${taskData.projectId} not found.`);
      throw new AppError('Project not found.', ErrorType.BAD_REQUEST);
    }

    // Only project owner, manager or admin can create tasks in a project
    if (project.owner.id !== creatorId && creatorRole !== UserRole.MANAGER && creatorRole !== UserRole.ADMIN) {
      logger.warn(`User ${creatorId} attempted to create task in project ${taskData.projectId} without permission.`);
      throw new AppError('Forbidden: You do not have permission to create tasks in this project.', ErrorType.FORBIDDEN);
    }

    let assignedTo: User | null = null;
    if (taskData.assignedToId) {
      assignedTo = await this.userRepository.findOne({ where: { id: taskData.assignedToId } });
      if (!assignedTo) {
        logger.warn(`Task creation failed: Assigned user with ID ${taskData.assignedToId} not found.`);
        throw new AppError('Assigned user not found.', ErrorType.BAD_REQUEST);
      }
    }

    const task = this.taskRepository.create({
      ...taskData,
      project,
      assignedTo: assignedTo,
    });

    await this.taskRepository.save(task);
    logger.info(`Task created: ${task.id} in project ${taskData.projectId}`);
    return task;
  }

  async getTasksByProjectId(projectId: string, userId: string, userRole: UserRole): Promise<Task[]> {
    const project = await this.projectRepository.findOne({ where: { id: projectId }, relations: ['owner'] });
    if (!project) {
      logger.warn(`Fetching tasks failed: Project with ID ${projectId} not found.`);
      throw new AppError('Project not found.', ErrorType.NOT_FOUND);
    }

    // Only project owner, manager, admin, or assigned user can view tasks in a project
    if (project.owner.id !== userId && userRole !== UserRole.MANAGER && userRole !== UserRole.ADMIN) {
      // Check if user is assigned to any task in this project
      const isAssigned = await this.taskRepository.exist({
        where: { projectId, assignedToId: userId }
      });
      if (!isAssigned) {
        logger.warn(`User ${userId} attempted to view tasks in project ${projectId} without permission.`);
        throw new AppError('Forbidden: You do not have permission to view tasks in this project.', ErrorType.FORBIDDEN);
      }
    }

    logger.debug(`Fetching tasks for project ID: ${projectId}`);
    return this.taskRepository.find({
      where: { projectId },
      relations: ['assignedTo', 'project'],
    });
  }

  async getTaskById(taskId: string, userId: string, userRole: UserRole): Promise<Task> {
    logger.debug(`Fetching task by ID: ${taskId}`);
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'project.owner', 'assignedTo'],
    });

    if (!task) {
      logger.warn(`Task with ID ${taskId} not found.`);
      throw new AppError('Task not found.', ErrorType.NOT_FOUND);
    }

    // Authorization check: Only project owner, manager, admin, or assigned user can view
    const isOwner = task.project.owner.id === userId;
    const isAssigned = task.assignedTo?.id === userId;
    const isManagerOrAdmin = userRole === UserRole.MANAGER || userRole === UserRole.ADMIN;

    if (!(isOwner || isAssigned || isManagerOrAdmin)) {
      logger.warn(`User ${userId} attempted to view task ${taskId} without permission.`);
      throw new AppError('Forbidden: You do not have permission to view this task.', ErrorType.FORBIDDEN);
    }

    return task;
  }

  async updateTask(taskId: string, updateData: UpdateTaskData, userId: string, userRole: UserRole): Promise<Task> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'project.owner', 'assignedTo'],
    });
    if (!task) {
      logger.warn(`Task update failed: Task with ID ${taskId} not found.`);
      throw new AppError('Task not found.', ErrorType.NOT_FOUND);
    }

    // Authorization check: Only project owner, manager, admin, or assigned user can update
    const isOwner = task.project.owner.id === userId;
    const isAssigned = task.assignedTo?.id === userId;
    const isManagerOrAdmin = userRole === UserRole.MANAGER || userRole === UserRole.ADMIN;

    if (!(isOwner || isAssigned || isManagerOrAdmin)) {
      logger.warn(`User ${userId} attempted to update task ${taskId} without permission.`);
      throw new AppError('Forbidden: You do not have permission to update this task.', ErrorType.FORBIDDEN);
    }

    let assignedTo: User | null = null;
    if (updateData.assignedToId !== undefined) {
      if (updateData.assignedToId === null) {
        assignedTo = null;
      } else {
        assignedTo = await this.userRepository.findOne({ where: { id: updateData.assignedToId } });
        if (!assignedTo) {
          logger.warn(`Task update failed: Assigned user with ID ${updateData.assignedToId} not found.`);
          throw new AppError('Assigned user not found.', ErrorType.BAD_REQUEST);
        }
      }
      Object.assign(task, { assignedTo }); // Assign the entity, not just the ID
    }

    // Remove assignedToId from updateData before Object.assign to avoid overwriting entity with just ID
    const { assignedToId, ...restUpdateData } = updateData;
    Object.assign(task, restUpdateData);

    await this.taskRepository.save(task);
    logger.info(`Task ${taskId} updated by user ${userId}`);
    return task;
  }

  async deleteTask(taskId: string, userId: string, userRole: UserRole): Promise<void> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['project', 'project.owner'],
    });
    if (!task) {
      logger.warn(`Task deletion failed: Task with ID ${taskId} not found.`);
      throw new AppError('Task not found.', ErrorType.NOT_FOUND);
    }

    // Authorization check: Only project owner or admin can delete tasks
    if (task.project.owner.id !== userId && userRole !== UserRole.ADMIN) {
      logger.warn(`User ${userId} attempted to delete task ${taskId} without permission.`);
      throw new AppError('Forbidden: You do not have permission to delete this task.', ErrorType.FORBIDDEN);
    }

    await this.taskRepository.remove(task);
    logger.info(`Task ${taskId} deleted by user ${userId}`);
  }
}

export default new TaskService();
```