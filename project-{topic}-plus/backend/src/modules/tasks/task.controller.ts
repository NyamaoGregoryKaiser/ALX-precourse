import { Request, Response, NextFunction } from 'express';
import { StatusCodes } => from 'http-status-codes';
import * as taskService from './task.service';
import * as projectService from '../projects/project.service'; // To check project ownership
import { AppError } from '../../utils/appError';
import { Role } from '@prisma/client';

/**
 * Handles creation of a new task.
 * Only accessible by ADMIN or the Project Manager of the associated project.
 */
export const createTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const taskData = req.body;
    const { projectId } = taskData;

    if (!req.user) {
        return next(new AppError('Authentication required to create task.', StatusCodes.UNAUTHORIZED));
    }

    const project = await projectService.getProjectById(projectId);
    if (!project) {
        return next(new AppError('Project not found.', StatusCodes.NOT_FOUND));
    }

    // Only ADMIN or the project's manager can create tasks in this project
    if (req.user.role !== Role.ADMIN && req.user.id !== project.managerId) {
      return next(new AppError('You do not have permission to create tasks in this project.', StatusCodes.FORBIDDEN));
    }

    const newTask = await taskService.createTask(taskData);
    res.status(StatusCodes.CREATED).json({
      status: 'success',
      data: { task: newTask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles retrieval of all tasks.
 * Access depends on user role and query parameters.
 */
export const getAllTasksHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Authentication required to access tasks.', StatusCodes.UNAUTHORIZED));
    }
    const tasks = await taskService.getAllTasks(req.query as any, req.user.id, req.user.role);
    res.status(StatusCodes.OK).json({
      status: 'success',
      results: tasks.length,
      data: { tasks },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles retrieval of a single task by ID.
 * Access depends on user role and association with the task/project.
 */
export const getTaskByIdHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const task = await taskService.getTaskById(id);

    if (!task) {
      return next(new AppError('Task not found', StatusCodes.NOT_FOUND));
    }

    if (!req.user) {
      return next(new AppError('Authentication required to view task.', StatusCodes.UNAUTHORIZED));
    }

    // ADMIN, PROJECT_MANAGER (of the project), or ASSIGNED_MEMBER can view
    const isProjectManager = task.project?.managerId === req.user.id;
    const isAssignedToUser = task.assignedToId === req.user.id;

    if (req.user.role === Role.ADMIN || isProjectManager || (req.user.role === Role.MEMBER && isAssignedToUser)) {
      return res.status(StatusCodes.OK).json({
        status: 'success',
        data: { task },
      });
    }

    return next(new AppError('You do not have permission to view this task.', StatusCodes.FORBIDDEN));
  } catch (error) {
    next(error);
  }
};

/**
 * Handles updating an existing task.
 * Access depends on user role and association.
 * MEMBER can only update their own task's status.
 * PM can update any task in their project.
 * ADMIN can update any task.
 */
export const updateTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (!req.user) {
      return next(new AppError('Authentication required to update task.', StatusCodes.UNAUTHORIZED));
    }

    const existingTask = await taskService.getTaskById(id);
    if (!existingTask) {
        return next(new AppError('Task not found', StatusCodes.NOT_FOUND));
    }

    const isProjectManager = existingTask.project?.managerId === req.user.id;
    const isAssignedToUser = existingTask.assignedToId === req.user.id;

    if (req.user.role === Role.ADMIN) {
      // ADMIN can update anything
    } else if (req.user.role === Role.PROJECT_MANAGER && isProjectManager) {
      // PM can update any fields for tasks in their project
    } else if (req.user.role === Role.MEMBER && isAssignedToUser) {
      // MEMBER can only update 'status' of their assigned tasks
      if (Object.keys(updateData).length === 1 && updateData.status) {
        // Only allow status update
        req.body = { status: updateData.status }; // Ensure only status is passed to service
      } else {
        return next(new AppError('Members can only update the status of their assigned tasks.', StatusCodes.FORBIDDEN));
      }
    } else {
      return next(new AppError('You do not have permission to update this task.', StatusCodes.FORBIDDEN));
    }

    const updatedTask = await taskService.updateTask(id, updateData);
    res.status(StatusCodes.OK).json({
      status: 'success',
      data: { task: updatedTask },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handles deleting a task.
 * Only accessible by ADMIN or the Project Manager of the associated project.
 */
export const deleteTaskHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!req.user) {
      return next(new AppError('Authentication required to delete task.', StatusCodes.UNAUTHORIZED));
    }

    const existingTask = await taskService.getTaskById(id);
    if (!existingTask) {
        return next(new AppError('Task not found', StatusCodes.NOT_FOUND));
    }

    // Only ADMIN or the project's manager can delete tasks in this project
    const isProjectManager = existingTask.project?.managerId === req.user.id;
    if (req.user.role !== Role.ADMIN && !isProjectManager) {
      return next(new AppError('You do not have permission to delete this task.', StatusCodes.FORBIDDEN));
    }

    await taskService.deleteTask(id);
    res.status(StatusCodes.NO_CONTENT).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
};
```