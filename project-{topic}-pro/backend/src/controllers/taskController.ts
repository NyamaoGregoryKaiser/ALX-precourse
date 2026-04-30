```typescript
import { Request, Response, NextFunction } from 'express';
import { TaskService, createTaskSchema, updateTaskSchema } from '../services/taskService';
import { validate } from '../utils/validation';
import { logger } from '../utils/logger';
import { NotFoundError } from '../utils/appErrors';
import { cacheMiddleware, invalidateCache } from '../middlewares/cacheMiddleware';

export class TaskController {
    private taskService: TaskService;

    constructor() {
        this.taskService = new TaskService();
    }

    // Middleware to apply caching for GET requests on task list
    getTasksCacheMiddleware = cacheMiddleware('tasks:user', 60); // Cache for 60 seconds

    async createTask(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId!; // Guaranteed by authMiddleware
            validate(createTaskSchema, req.body);

            const task = await this.taskService.createTask(req.body, userId);
            logger.info(`Task created by user ${userId}: ${task.id}`);
            res.status(201).json({ success: true, message: 'Task created successfully.', task });
        } catch (error) {
            next(error);
        }
    }

    async getTasks(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId!;
            const status = req.query.status as string | undefined;

            const tasks = await this.taskService.getTasksByUserId(userId, status);
            res.status(200).json({ success: true, tasks });
        } catch (error) {
            next(error);
        }
    }

    async getTaskById(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId!;
            const taskId = req.params.id;

            const task = await this.taskService.getTaskById(taskId, userId);
            res.status(200).json({ success: true, task });
        } catch (error) {
            next(error);
        }
    }

    async updateTask(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId!;
            const taskId = req.params.id;
            validate(updateTaskSchema, req.body);

            const updatedTask = await this.taskService.updateTask(taskId, userId, req.body);
            logger.info(`Task updated by user ${userId}: ${taskId}`);
            res.status(200).json({ success: true, message: 'Task updated successfully.', task: updatedTask });
        } catch (error) {
            next(error);
        }
    }

    async deleteTask(req: Request, res: Response, next: NextFunction) {
        try {
            const userId = req.userId!;
            const taskId = req.params.id;

            await this.taskService.deleteTask(taskId, userId);
            logger.info(`Task deleted by user ${userId}: ${taskId}`);
            res.status(204).json({ success: true, message: 'Task deleted successfully.' }); // 204 No Content
        } catch (error) {
            next(error);
        }
    }
}
```