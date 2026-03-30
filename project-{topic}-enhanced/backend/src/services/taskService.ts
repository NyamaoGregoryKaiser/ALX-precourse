import { TaskRepository } from '../repositories/TaskRepository';
import { ProjectRepository } from '../repositories/ProjectRepository';
import { UserRepository } from '../repositories/UserRepository';
import { Task, TaskStatus, TaskPriority } from '../entities/Task';
import { User, UserRole } from '../entities/User';
import { ApiError } from '../utils/ApiError';
import httpStatus from 'http-status';
import { clearCache } from '../middleware/cache';

const createTask = async (
  title: string,
  description: string | undefined,
  projectId: string,
  assignedToId: string | undefined,
  status: TaskStatus,
  priority: TaskPriority,
  dueDate: Date | undefined,
  creatorId: string,
  creatorRole: UserRole
): Promise<Task> => {
  const project = await ProjectRepository.findByIdWithOwner(projectId);
  if (!project) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Project not found');
  }
  // Only project owner or admin can create tasks in a project
  if (project.ownerId !== creatorId && creatorRole !== UserRole.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to add tasks to this project');
  }

  let assignedTo: User | undefined;
  if (assignedToId) {
    assignedTo = await UserRepository.findById(assignedToId);
    if (!assignedTo) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Assigned user not found');
    }
  }

  const task = TaskRepository.create({
    title,
    description,
    project,
    projectId,
    assignedTo,
    assignedToId,
    status,
    priority,
    dueDate,
  });
  await TaskRepository.save(task);
  await clearCache([`project-tasks:${projectId}`, `user-assigned-tasks:${assignedToId}`]);
  return task;
};

const getTaskById = async (taskId: string, userId: string, userRole: UserRole): Promise<Task | null> => {
  const task = await TaskRepository.findByIdWithRelations(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  // Check if user has access to the task's project or is assigned to the task, or is admin
  const isProjectOwner = task.project.ownerId === userId;
  const isAssignedToUser = task.assignedToId === userId;

  if (!isProjectOwner && !isAssignedToUser && userRole !== UserRole.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have access to this task');
  }

  return task;
};

const updateTask = async (
  taskId: string,
  updateBody: Partial<Omit<Task, 'projectId' | 'project'>>,
  userId: string,
  userRole: UserRole
): Promise<Task> => {
  const task = await TaskRepository.findByIdWithRelations(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  const isProjectOwner = task.project.ownerId === userId;
  const isAssignedToUser = task.assignedToId === userId;

  // Only project owner, assigned user, or admin can update a task.
  // Specific fields might have more granular permissions (e.g., only owner can reassign)
  if (!isProjectOwner && !isAssignedToUser && userRole !== UserRole.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to update this task');
  }

  // Handle assignedToId update carefully:
  if (updateBody.assignedToId !== undefined) {
    if (!isProjectOwner && userRole !== UserRole.ADMIN) { // Only project owner or admin can reassign
      throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to reassign tasks.');
    }
    if (updateBody.assignedToId === null) {
      task.assignedTo = undefined;
      task.assignedToId = undefined;
    } else {
      const assignedToUser = await UserRepository.findById(updateBody.assignedToId);
      if (!assignedToUser) {
        throw new ApiError(httpStatus.BAD_REQUEST, 'Assigned user not found');
      }
      task.assignedTo = assignedToUser;
      task.assignedToId = assignedToUser.id;
    }
    delete updateBody.assignedToId; // Remove from updateBody to prevent direct assignment
  }

  // Only project owner or admin can change project (though not supported by API in this version)
  if (updateBody.projectId && updateBody.projectId !== task.projectId) {
    throw new ApiError(httpStatus.FORBIDDEN, 'Cannot change project for an existing task');
  }

  Object.assign(task, updateBody);
  await TaskRepository.save(task);
  await clearCache([`project-tasks:${task.projectId}`, `user-assigned-tasks:${task.assignedToId}`, `user-assigned-tasks:${userId}`, `task:${taskId}`]);
  return task;
};

const deleteTask = async (taskId: string, userId: string, userRole: UserRole): Promise<void> => {
  const task = await TaskRepository.findByIdWithRelations(taskId);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }

  // Only project owner or admin can delete a task
  if (task.project.ownerId !== userId && userRole !== UserRole.ADMIN) {
    throw new ApiError(httpStatus.FORBIDDEN, 'You do not have permission to delete this task');
  }

  await TaskRepository.remove(task);
  await clearCache([`project-tasks:${task.projectId}`, `user-assigned-tasks:${task.assignedToId}`, `task:${taskId}`]);
};

const getTasksAssignedToUser = async (userId: string, userRole: UserRole, status?: TaskStatus): Promise<Task[]> => {
  // A user can always see tasks assigned to them. Admins can see any tasks.
  // For simplicity, we assume 'userId' here refers to the requesting user's ID.
  return TaskRepository.findByAssignedUserWithRelations(userId, status);
};

export const taskService = {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getTasksAssignedToUser,
};
```

#### `backend/src/controllers/authController.ts`
```typescript