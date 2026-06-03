```typescript
import { Request, Response, NextFunction } from 'express';
import * as taskService from './task.service';
import { HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, dueDate, categoryId, status } = req.body;
    const task = await taskService.createTask({
      title,
      description,
      dueDate,
      categoryId,
      status,
      userId: req.user!.id,
    });

    res.status(HttpCode.CREATED).json({
      status: 'success',
      message: 'Task created successfully',
      data: { task },
    });
  } catch (error: any) {
    logger.error(`Error creating task: ${error.message}`);
    next(error);
  }
};

export const getAllTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.id;
    const { status, categoryId, search, sortBy, sortOrder, page, limit } = req.query;

    const tasks = await taskService.getAllTasks(userId, {
      status: status as string,
      categoryId: categoryId as string,
      search: search as string,
      sortBy: sortBy as string,
      sortOrder: sortOrder as 'asc' | 'desc',
      page: page ? parseInt(page as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
    });

    res.status(HttpCode.OK).json({
      status: 'success',
      results: tasks.length,
      data: { tasks },
    });
  } catch (error: any) {
    logger.error(`Error fetching tasks for user ${req.user!.id}: ${error.message}`);
    next(error);
  }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const task = await taskService.getTaskById(taskId, req.user!.id);

    res.status(HttpCode.OK).json({
      status: 'success',
      data: { task },
    });
  } catch (error: any) {
    logger.error(`Error fetching task ${req.params.id}: ${error.message}`);
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    const updateData = req.body;
    const updatedTask = await taskService.updateTask(taskId, req.user!.id, updateData);

    res.status(HttpCode.OK).json({
      status: 'success',
      message: 'Task updated successfully',
      data: { task: updatedTask },
    });
  } catch (error: any) {
    logger.error(`Error updating task ${req.params.id}: ${error.message}`);
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskId = req.params.id;
    await taskService.deleteTask(taskId, req.user!.id);

    res.status(HttpCode.NO_CONTENT).json({
      status: 'success',
      message: 'Task deleted successfully',
      data: null,
    });
  } catch (error: any) {
    logger.error(`Error deleting task ${req.params.id}: ${error.message}`);
    next(error);
  }
};
```