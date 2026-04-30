```typescript
import { AppDataSource } from '../config/data-source';
import { Task } from '../database/entities/Task';
import { NotFoundError, ForbiddenError } from '../utils/appErrors';
import { User } from '../database/entities/User';
import { In, FindManyOptions } from 'typeorm';
import { z } from 'zod';
import { invalidateCache } from '../middlewares/cacheMiddleware';

// Zod schemas for validation
export const createTaskSchema = z.object({
    title: z.string().min(1).max(255),
    description: z.string().max(1000).nullable().optional(),
    status: z.enum(['pending', 'in-progress', 'completed']).default('pending'),
    dueDate: z.string().datetime().nullable().optional(),
});

export const updateTaskSchema = createTaskSchema.partial(); // All fields are optional for update

export class TaskService {
    private taskRepository = AppDataSource.getRepository(Task);
    private userRepository = AppDataSource.getRepository(User); // For type safety

    async createTask(taskData: z.infer<typeof createTaskSchema>, userId: string): Promise<Task> {
        // Validate input using Zod
        const validatedData = createTaskSchema.parse(taskData);

        const user = await this.userRepository.findOneBy({ id: userId });
        if (!user) {
            throw new NotFoundError('User not found.'); // Should ideally not happen if auth middleware works
        }

        const task = this.taskRepository.create({
            ...validatedData,
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
            user: user,
            userId: user.id
        });
        await this.taskRepository.save(task);

        // Invalidate cache for this user's tasks
        await invalidateCache(`tasks:user:${userId}:*`);

        return task;
    }

    async getTaskById(taskId: string, userId: string): Promise<Task> {
        const task = await this.taskRepository.findOne({
            where: { id: taskId, userId: userId },
            relations: ['user'], // Eagerly load user details if needed
        });

        if (!task) {
            throw new NotFoundError('Task not found or you do not have permission to view it.');
        }
        return task;
    }

    async getTasksByUserId(userId: string, status?: string): Promise<Task[]> {
        const findOptions: FindManyOptions<Task> = {
            where: { userId },
            order: { createdAt: 'DESC' }, // Example for query optimization
            select: ['id', 'title', 'description', 'status', 'dueDate', 'createdAt', 'updatedAt'] // Select specific columns
        };

        if (status && ['pending', 'in-progress', 'completed'].includes(status)) {
            (findOptions.where as any).status = status;
        }

        const tasks = await this.taskRepository.find(findOptions);
        return tasks;
    }

    async updateTask(taskId: string, userId: string, updateData: z.infer<typeof updateTaskSchema>): Promise<Task> {
        // Validate input using Zod
        const validatedData = updateTaskSchema.parse(updateData);

        const task = await this.taskRepository.findOneBy({ id: taskId });

        if (!task) {
            throw new NotFoundError('Task not found.');
        }

        if (task.userId !== userId) {
            throw new ForbiddenError('You do not have permission to update this task.');
        }

        Object.assign(task, {
            ...validatedData,
            dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : task.dueDate,
        });
        await this.taskRepository.save(task);

        // Invalidate cache for this user's tasks
        await invalidateCache(`tasks:user:${userId}:*`);
        await invalidateCache(`tasks:id:${taskId}:*`); // Invalidate specific task cache

        return task;
    }

    async deleteTask(taskId: string, userId: string): Promise<void> {
        const task = await this.taskRepository.findOneBy({ id: taskId });

        if (!task) {
            throw new NotFoundError('Task not found.');
        }

        if (task.userId !== userId) {
            throw new ForbiddenError('You do not have permission to delete this task.');
        }

        await this.taskRepository.remove(task);

        // Invalidate cache for this user's tasks
        await invalidateCache(`tasks:user:${userId}:*`);
        await invalidateCache(`tasks:id:${taskId}:*`); // Invalidate specific task cache
    }
}
```