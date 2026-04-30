```typescript
import { AppDataSource } from '../../src/config/data-source';
import { TaskService } from '../../src/services/taskService';
import { Task } from '../../src/database/entities/Task';
import { User } from '../../src/database/entities/User';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../src/utils/appErrors';
import * as cacheMiddleware from '../../src/middlewares/cacheMiddleware';

describe('TaskService (Unit)', () => {
    let taskService: TaskService;
    let taskRepository: any;
    let userRepository: any;
    let mockInvalidateCache: jest.SpyInstance;

    const mockUser = { id: 'user-uuid-1', username: 'testuser', email: 'test@example.com', password: 'hashedpassword' } as User;
    const mockTask = {
        id: 'task-uuid-1',
        title: 'Test Task',
        description: 'Description',
        status: 'pending',
        dueDate: new Date(),
        userId: mockUser.id,
        user: mockUser,
    } as Task;

    beforeEach(() => {
        taskRepository = AppDataSource.getRepository(Task);
        userRepository = AppDataSource.getRepository(User);
        taskService = new TaskService();

        mockInvalidateCache = jest.spyOn(cacheMiddleware, 'invalidateCache').mockResolvedValue(undefined);

        // Mock repository methods
        jest.spyOn(userRepository, 'findOneBy').mockResolvedValue(mockUser);
        jest.spyOn(taskRepository, 'findOne').mockResolvedValue(null);
        jest.spyOn(taskRepository, 'findOneBy').mockResolvedValue(null);
        jest.spyOn(taskRepository, 'create').mockImplementation((data) => ({ ...data, id: 'new-task-uuid' }));
        jest.spyOn(taskRepository, 'save').mockImplementation((task) => Promise.resolve(task));
        jest.spyOn(taskRepository, 'find').mockResolvedValue([]);
        jest.spyOn(taskRepository, 'remove').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe('createTask', () => {
        it('should create a new task for a user', async () => {
            const taskData = {
                title: 'New Task',
                description: 'New Description',
                status: 'pending',
                dueDate: new Date().toISOString(),
            };

            const result = await taskService.createTask(taskData, mockUser.id);

            expect(userRepository.findOneBy).toHaveBeenCalledWith({ id: mockUser.id });
            expect(taskRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                title: taskData.title,
                userId: mockUser.id,
                user: mockUser,
            }));
            expect(taskRepository.save).toHaveBeenCalled();
            expect(mockInvalidateCache).toHaveBeenCalledWith(`tasks:user:${mockUser.id}:*`);
            expect(result).toHaveProperty('id', 'new-task-uuid');
            expect(result.title).toBe(taskData.title);
        });

        it('should throw NotFoundError if user does not exist (though auth middleware should prevent this)', async () => {
            (userRepository.findOneBy as jest.Mock).mockResolvedValue(null);
            const taskData = { title: 'New Task' };

            await expect(taskService.createTask(taskData, 'non-existent-user')).rejects.toThrow(NotFoundError);
            await expect(taskService.createTask(taskData, 'non-existent-user')).rejects.toHaveProperty('message', 'User not found.');
        });

        it('should throw BadRequestError for invalid task data', async () => {
            const invalidTaskData = { title: '', description: 'Some desc', status: 'invalid-status' };
            await expect(taskService.createTask(invalidTaskData as any, mockUser.id)).rejects.toThrow(BadRequestError);
            await expect(taskService.createTask(invalidTaskData as any, mockUser.id)).rejects.toHaveProperty('message', 'Validation failed.');
        });
    });

    describe('getTaskById', () => {
        it('should return a task if found and owned by the user', async () => {
            (taskRepository.findOne as jest.Mock).mockResolvedValue(mockTask);

            const result = await taskService.getTaskById(mockTask.id, mockUser.id);

            expect(taskRepository.findOne).toHaveBeenCalledWith({
                where: { id: mockTask.id, userId: mockUser.id },
                relations: ['user'],
            });
            expect(result).toEqual(mockTask);
        });

        it('should throw NotFoundError if task not found for user', async () => {
            (taskRepository.findOne as jest.Mock).mockResolvedValue(null);

            await expect(taskService.getTaskById('non-existent-task', mockUser.id)).rejects.toThrow(NotFoundError);
            await expect(taskService.getTaskById('non-existent-task', mockUser.id)).rejects.toHaveProperty('message', 'Task not found or you do not have permission to view it.');
        });
    });

    describe('getTasksByUserId', () => {
        it('should return all tasks for a user', async () => {
            const userTasks = [{ ...mockTask, id: 'task-1' }, { ...mockTask, id: 'task-2' }];
            (taskRepository.find as jest.Mock).mockResolvedValue(userTasks);

            const result = await taskService.getTasksByUserId(mockUser.id);

            expect(taskRepository.find).toHaveBeenCalledWith({
                where: { userId: mockUser.id },
                order: { createdAt: 'DESC' },
                select: ['id', 'title', 'description', 'status', 'dueDate', 'createdAt', 'updatedAt']
            });
            expect(result).toEqual(userTasks);
        });

        it('should filter tasks by status if provided', async () => {
            const userTasks = [{ ...mockTask, id: 'task-1', status: 'completed' }];
            (taskRepository.find as jest.Mock).mockResolvedValue(userTasks);

            const result = await taskService.getTasksByUserId(mockUser.id, 'completed');

            expect(taskRepository.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId: mockUser.id, status: 'completed' }
            }));
            expect(result).toEqual(userTasks);
        });
    });

    describe('updateTask', () => {
        it('should update a task if found and owned by the user', async () => {
            (taskRepository.findOneBy as jest.Mock).mockResolvedValue({ ...mockTask }); // Return a copy to allow modification
            const updateData = { title: 'Updated Title', status: 'completed' };

            const result = await taskService.updateTask(mockTask.id, mockUser.id, updateData);

            expect(taskRepository.findOneBy).toHaveBeenCalledWith({ id: mockTask.id });
            expect(taskRepository.save).toHaveBeenCalledWith(expect.objectContaining({
                id: mockTask.id,
                title: updateData.title,
                status: updateData.status,
            }));
            expect(mockInvalidateCache).toHaveBeenCalledWith(`tasks:user:${mockUser.id}:*`);
            expect(mockInvalidateCache).toHaveBeenCalledWith(`tasks:id:${mockTask.id}:*`);
            expect(result.title).toBe(updateData.title);
            expect(result.status).toBe(updateData.status);
        });

        it('should throw NotFoundError if task does not exist', async () => {
            (taskRepository.findOneBy as jest.Mock).mockResolvedValue(null);
            const updateData = { title: 'Updated Title' };

            await expect(taskService.updateTask('non-existent-task', mockUser.id, updateData)).rejects.toThrow(NotFoundError);
            await expect(taskService.updateTask('non-existent-task', mockUser.id, updateData)).rejects.toHaveProperty('message', 'Task not found.');
        });

        it('should throw ForbiddenError if user does not own the task', async () => {
            (taskRepository.findOneBy as jest.Mock).mockResolvedValue({ ...mockTask, userId: 'another-user-id' });
            const updateData = { title: 'Updated Title' };

            await expect(taskService.updateTask(mockTask.id, mockUser.id, updateData)).rejects.toThrow(ForbiddenError);
            await expect(taskService.updateTask(mockTask.id, mockUser.id, updateData)).rejects.toHaveProperty('message', 'You do not have permission to update this task.');
        });
    });

    describe('deleteTask', () => {
        it('should delete a task if found and owned by the user', async () => {
            (taskRepository.findOneBy as jest.Mock).mockResolvedValue(mockTask);

            await taskService.deleteTask(mockTask.id, mockUser.id);

            expect(taskRepository.findOneBy).toHaveBeenCalledWith({ id: mockTask.id });
            expect(taskRepository.remove).toHaveBeenCalledWith(mockTask);
            expect(mockInvalidateCache).toHaveBeenCalledWith(`tasks:user:${mockUser.id}:*`);
            expect(mockInvalidateCache).toHaveBeenCalledWith(`tasks:id:${mockTask.id}:*`);
        });

        it('should throw NotFoundError if task does not exist', async () => {
            (taskRepository.findOneBy as jest.Mock).mockResolvedValue(null);

            await expect(taskService.deleteTask('non-existent-task', mockUser.id)).rejects.toThrow(NotFoundError);
            await expect(taskService.deleteTask('non-existent-task', mockUser.id)).rejects.toHaveProperty('message', 'Task not found.');
        });

        it('should throw ForbiddenError if user does not own the task', async () => {
            (taskRepository.findOneBy as jest.Mock).mockResolvedValue({ ...mockTask, userId: 'another-user-id' });

            await expect(taskService.deleteTask(mockTask.id, mockUser.id)).rejects.toThrow(ForbiddenError);
            await expect(taskService.deleteTask(mockTask.id, mockUser.id)).rejects.toHaveProperty('message', 'You do not have permission to delete this task.');
        });
    });
});
```