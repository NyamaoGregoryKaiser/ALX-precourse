```typescript
import { Request, Response, NextFunction } from 'express';
import taskService from '@services/task.service';
import logger from '@config/logger';

class TaskController {
  async createTask(req: Request, res: Response, next: NextFunction) {
    try {
      const taskData = req.body;
      const creatorId = req.user!.id;
      const creatorRole = req.user!.role;
      const task = await taskService.createTask(taskData, creatorId, creatorRole);
      res.status(201).json(task);
    } catch (error) {
      logger.error(`Create task controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async getTasksByProjectId(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const tasks = await taskService.getTasksByProjectId(projectId, userId, userRole);
      res.status(200).json(tasks);
    } catch (error) {
      logger.error(`Get tasks by project ID controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async getTaskById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const task = await taskService.getTaskById(id, userId, userRole);
      res.status(200).json(task);
    } catch (error) {
      logger.error(`Get task by ID controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async updateTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      const updatedTask = await taskService.updateTask(id, updateData, userId, userRole);
      res.status(200).json(updatedTask);
    } catch (error) {
      logger.error(`Update task controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }

  async deleteTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const userRole = req.user!.role;
      await taskService.deleteTask(id, userId, userRole);
      res.status(204).send();
    } catch (error) {
      logger.error(`Delete task controller error: ${error instanceof Error ? error.message : error}`);
      next(error);
    }
  }
}

export default new TaskController();
```