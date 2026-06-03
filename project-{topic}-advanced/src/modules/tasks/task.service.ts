```typescript
import * as taskRepository from './task.repository';
import * as categoryRepository from '../categories/category.repository';
import { AppError, HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { cacheDel, cacheGet, cacheSet } from '../../utils/redis-client';
import { CACHE_KEYS, TASK_STATUS } from '../../config/constants';

interface TaskInput {
  title: string;
  description?: string;
  dueDate?: Date;
  categoryId?: string;
  status?: string;
  userId: string;
}

interface TaskUpdateInput {
  title?: string;
  description?: string;
  dueDate?: Date;
  categoryId?: string;
  status?: string;
}

interface TaskFilters {
  status?: string;
  categoryId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export const createTask = async (taskInput: TaskInput) => {
  try {
    if (taskInput.categoryId) {
      const category = await categoryRepository.findCategoryByIdAndUser(taskInput.categoryId, taskInput.userId);
      if (!category) {
        throw new AppError('Category not found or not owned by user', HttpCode.BAD_REQUEST);
      }
    }
    if (taskInput.status && !Object.values(TASK_STATUS).includes(taskInput.status as any)) {
      throw new AppError(`Invalid task status. Allowed: ${Object.values(TASK_STATUS).join(', ')}`, HttpCode.BAD_REQUEST);
    }
    const task = await taskRepository.createTask(taskInput);
    // Invalidate relevant caches (e.g., all tasks for this user)
    return task;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in createTask service for user ${taskInput.userId}:`, error);
    throw new AppError('Could not create task', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const getAllTasks = async (userId: string, filters: TaskFilters) => {
  try {
    // A more complex cache key could be formed from filters, but often for list views,
    // a simpler approach is to not cache or use a very short expiry.
    // For now, no caching for filtered lists to keep it simple and accurate.
    const tasks = await taskRepository.findAllTasks(userId, filters);
    return tasks;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in getAllTasks service for user ${userId}:`, error);
    throw new AppError('Could not retrieve tasks', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const getTaskById = async (taskId: string, userId: string) => {
  try {
    const cacheKey = CACHE_KEYS.TASK_BY_ID(taskId);
    const cachedTask = await cacheGet(cacheKey);
    if (cachedTask) {
      return cachedTask;
    }

    const task = await taskRepository.findTaskByIdAndUser(taskId, userId);
    if (!task) {
      throw new AppError('Task not found or not owned by user', HttpCode.NOT_FOUND);
    }
    await cacheSet(cacheKey, task, 60); // Cache for 1 minute
    return task;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in getTaskById service for task ${taskId} by user ${userId}:`, error);
    throw new AppError('Could not retrieve task', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const updateTask = async (taskId: string, userId: string, updateData: TaskUpdateInput) => {
  try {
    const existingTask = await taskRepository.findTaskByIdAndUser(taskId, userId);
    if (!existingTask) {
      throw new AppError('Task not found or not owned by user', HttpCode.NOT_FOUND);
    }

    if (updateData.categoryId) {
      const category = await categoryRepository.findCategoryByIdAndUser(updateData.categoryId, userId);
      if (!category) {
        throw new AppError('Category not found or not owned by user', HttpCode.BAD_REQUEST);
      }
    }
    if (updateData.status && !Object.values(TASK_STATUS).includes(updateData.status as any)) {
      throw new AppError(`Invalid task status. Allowed: ${Object.values(TASK_STATUS).join(', ')}`, HttpCode.BAD_REQUEST);
    }

    const updatedTask = await taskRepository.updateTask(taskId, updateData);
    await cacheDel(CACHE_KEYS.TASK_BY_ID(taskId)); // Invalidate cache for this specific task
    return updatedTask;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in updateTask service for task ${taskId} by user ${userId}:`, error);
    throw new AppError('Could not update task', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const deleteTask = async (taskId: string, userId: string) => {
  try {
    const existingTask = await taskRepository.findTaskByIdAndUser(taskId, userId);
    if (!existingTask) {
      throw new AppError('Task not found or not owned by user', HttpCode.NOT_FOUND);
    }
    await taskRepository.deleteTask(taskId);
    await cacheDel(CACHE_KEYS.TASK_BY_ID(taskId)); // Invalidate cache for this specific task
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in deleteTask service for task ${taskId} by user ${userId}:`, error);
    throw new AppError('Could not delete task', HttpCode.INTERNAL_SERVER_ERROR);
  }
};
```