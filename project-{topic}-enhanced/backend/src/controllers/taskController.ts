import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/taskService';
import httpStatus from 'http-status';
import { catchAsync } from '../utils/catchAsync';
import { TaskStatus } from '../entities/Task';
import { ApiError } from '../utils/ApiError';

const createTask = catchAsync(async (req: Request, res: Response) => {
  const { title, description, projectId, assignedToId, status, priority, dueDate } = req.body;
  const task = await taskService.createTask(
    title,
    description,
    projectId,
    assignedToId,
    status,
    priority,
    dueDate ? new Date(dueDate) : undefined,
    req.user!.id,
    req.user!.role
  );
  res.status(httpStatus.CREATED).send(task);
});

const getTask = catchAsync(async (req: Request, res: Response) => {
  const task = await taskService.getTaskById(req.params.taskId, req.user!.id, req.user!.role);
  if (!task) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Task not found');
  }
  res.send(task);
});

const updateTask = catchAsync(async (req: Request, res: Response) => {
  const task = await taskService.updateTask(req.params.taskId, req.body, req.user!.id, req.user!.role);
  res.send(task);
});

const deleteTask = catchAsync(async (req: Request, res: Response) => {
  await taskService.deleteTask(req.params.taskId, req.user!.id, req.user!.role);
  res.status(httpStatus.NO_CONTENT).send();
});

const getAssignedTasks = catchAsync(async (req: Request, res: Response) => {
  const { status } = req.query;
  const tasks = await taskService.getTasksAssignedToUser(req.user!.id, req.user!.role, status as TaskStatus);
  res.send(tasks);
});

export const taskController = {
  createTask,
  getTask,
  updateTask,
  deleteTask,
  getAssignedTasks,
};
```

#### `backend/src/routes/v1/auth.route.ts`
```typescript