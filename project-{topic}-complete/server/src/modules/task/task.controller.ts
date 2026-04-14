import { Request, Response, NextFunction } from 'express';
import * as taskService from './task.service';
import { CustomError } from '../../middlewares/error.middleware';
import { invalidateCache } from '../../middlewares/cache.middleware';
import { TaskPriority, TaskStatus } from '@prisma/client';

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title, description, projectId, assigneeId, dueDate, priority, status } = req.body;
    const reporterId = req.user?.userId;

    if (!reporterId) {
      throw new CustomError('Unauthorized: Reporter ID is missing.', 401);
    }
    if (!title || !projectId) {
      throw new CustomError('Task title and Project ID are required.', 400);
    }

    const task = await taskService.createTask({
      title,
      description,
      projectId,
      assigneeId,
      reporterId,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority: priority as TaskPriority,
      status: status as TaskStatus,
    });
    await invalidateCache('tasks');
    await invalidateCache(`project:${projectId}`); // Invalidate project details cache
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    next(error);
  }
};

export const getTasks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { projectId, assigneeId, status, priority } = req.query;
    const tasks = await taskService.getTasks({
      projectId: projectId as string,
      assigneeId: assigneeId as string,
      status: status as string,
      priority: priority as string,
    });
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);
    if (!task) {
      throw new CustomError('Task not found.', 404);
    }
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      throw new CustomError('Unauthorized: User ID is missing.', 401);
    }

    // Convert dueDate string to Date object if present
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }

    const updatedTask = await taskService.updateTask(id, updateData, userId);
    if (!updatedTask) {
      throw new CustomError('Task not found or you are not authorized to update it.', 404);
    }
    await invalidateCache('tasks');
    await invalidateCache(`project:${updatedTask.projectId}`); // Invalidate project details cache
    await invalidateCache(`task:${id}`); // Invalidate specific task cache
    res.status(200).json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new CustomError('Unauthorized: User ID is missing.', 401);
    }

    const deletedTask = await taskService.deleteTask(id, userId);
    if (!deletedTask) {
      throw new CustomError('Task not found or you are not authorized to delete it.', 404);
    }
    await invalidateCache('tasks');
    await invalidateCache(`project:${deletedTask.projectId}`); // Invalidate project details cache
    await invalidateCache(`task:${id}`);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};