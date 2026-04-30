```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/config/data-source';
import { User } from '../../src/database/entities/User';
import { Task } from '../../src/database/entities/Task';
import { hashPassword } from '../../src/utils/passwordUtils';
import { generateToken } from '../../src/utils/jwtUtils';
import redisClient from '../../src/config/redisClient';

describe('Task API Integration Tests', () => {
    let userRepository: any;
    let taskRepository: any;
    let testUser: User;
    let anotherUser: User;
    let authToken: string;
    let anotherAuthToken: string;
    let testTask: Task;

    beforeAll(async () => {
        userRepository = AppDataSource.getRepository(User);
        taskRepository = AppDataSource.getRepository(Task);

        testUser = userRepository.create({
            username: 'tasktestuser',
            email: 'task@example.com',
            password: await hashPassword('password123'),
        });
        await userRepository.save(testUser);
        authToken = generateToken(testUser.id);

        anotherUser = userRepository.create({
            username: 'anothertaskuser',
            email: 'another@example.com',
            password: await hashPassword('password123'),
        });
        await userRepository.save(anotherUser);
        anotherAuthToken = generateToken(anotherUser.id);
    });

    beforeEach(async () => {
        // Clear tasks for testUser before each test
        await taskRepository.delete({ userId: testUser.id });
        await taskRepository.delete({ userId: anotherUser.id }); // Ensure anotherUser's tasks are also cleared

        testTask = taskRepository.create({
            title: 'Initial Task',
            description: 'This is a test task.',
            status: 'pending',
            dueDate: new Date(),
            userId: testUser.id,
            user: testUser,
        });
        await taskRepository.save(testTask);

        // Clear Redis cache before each test
        await redisClient.flushdb();
    });

    describe('POST /api/v1/tasks', () => {
        it('should create a new task successfully', async () => {
            const taskData = {
                title: 'New Task',
                description: 'Description for new task',
                status: 'in-progress',
                dueDate: new Date().toISOString(),
            };

            const res = await request(app)
                .post('/api/v1/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send(taskData);

            expect(res.statusCode).toEqual(201);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Task created successfully.');
            expect(res.body.task).toHaveProperty('id');
            expect(res.body.task.title).toBe(taskData.title);
            expect(res.body.task.userId).toBe(testUser.id);

            const taskInDb = await taskRepository.findOneBy({ id: res.body.task.id });
            expect(taskInDb).toBeDefined();
            expect(taskInDb!.title).toBe(taskData.title);
        });

        it('should return 400 for invalid task data', async () => {
            const taskData = {
                title: '', // Invalid title
                status: 'invalid-status', // Invalid status
            };

            const res = await request(app)
                .post('/api/v1/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send(taskData);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed.');
            expect(res.body.errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({ field: 'title', message: 'String must contain at least 1 character(s)' }),
                    expect.objectContaining({ field: 'status', message: "Invalid enum value. Expected 'pending' | 'in-progress' | 'completed', received 'invalid-status'" }),
                ])
            );
        });

        it('should return 401 if no token is provided', async () => {
            const res = await request(app).post('/api/v1/tasks').send({ title: 'Task' });
            expect(res.statusCode).toEqual(401);
        });
    });

    describe('GET /api/v1/tasks', () => {
        it('should return all tasks for the authenticated user', async () => {
            await taskRepository.save(taskRepository.create({ title: 'Another Task', userId: testUser.id, user: testUser }));
            await taskRepository.save(taskRepository.create({ title: 'Third Task', userId: anotherUser.id, user: anotherUser })); // Task for another user

            const res = await request(app)
                .get('/api/v1/tasks')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.tasks).toHaveLength(2); // Initial Task + Another Task
            expect(res.body.tasks[0].userId).toBe(testUser.id);
            expect(res.body.tasks.some((t: any) => t.title === 'Third Task')).toBe(false); // Should not see another user's task
        });

        it('should return tasks filtered by status', async () => {
            await taskRepository.save(taskRepository.create({ title: 'Completed Task', userId: testUser.id, user: testUser, status: 'completed' }));
            await taskRepository.save(taskRepository.create({ title: 'In Progress Task', userId: testUser.id, user: testUser, status: 'in-progress' }));

            const res = await request(app)
                .get('/api/v1/tasks?status=completed')
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.tasks).toHaveLength(1);
            expect(res.body.tasks[0].title).toBe('Completed Task');
        });

        it('should utilize cache for subsequent requests to /api/v1/tasks', async () => {
            const initialRes = await request(app)
                .get('/api/v1/tasks')
                .set('Authorization', `Bearer ${authToken}`);

            expect(initialRes.statusCode).toBe(200);
            expect(initialRes.body.tasks).toHaveLength(1);

            // Add a new task (this should invalidate the cache)
            await request(app)
                .post('/api/v1/tasks')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ title: 'Another task for cache test' });

            // This request should trigger a cache miss and re-populate the cache
            const secondRes = await request(app)
                .get('/api/v1/tasks')
                .set('Authorization', `Bearer ${authToken}`);

            expect(secondRes.statusCode).toBe(200);
            expect(secondRes.body.tasks).toHaveLength(2); // Should include the new task

            // Third request should hit the cache
            const thirdRes = await request(app)
                .get('/api/v1/tasks')
                .set('Authorization', `Bearer ${authToken}`);

            expect(thirdRes.statusCode).toBe(200);
            expect(thirdRes.body.tasks).toHaveLength(2);
            // Verify cache hit by checking if Redis key exists (optional, more for internal checks)
            const cacheKey = `tasks:user:${testUser.id}:/api/v1/tasks`;
            const cachedValue = await redisClient.get(cacheKey);
            expect(cachedValue).toBeDefined();
        });
    });

    describe('GET /api/v1/tasks/:id', () => {
        it('should return a specific task by ID for the owner', async () => {
            const res = await request(app)
                .get(`/api/v1/tasks/${testTask.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.task.id).toBe(testTask.id);
            expect(res.body.task.title).toBe(testTask.title);
        });

        it('should return 404 if task ID does not exist for the user', async () => {
            const res = await request(app)
                .get(`/api/v1/tasks/some-non-existent-uuid`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Task not found or you do not have permission to view it.');
        });

        it('should return 404 if task belongs to another user', async () => {
            const res = await request(app)
                .get(`/api/v1/tasks/${testTask.id}`)
                .set('Authorization', `Bearer ${anotherAuthToken}`); // Another user's token

            expect(res.statusCode).toEqual(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Task not found or you do not have permission to view it.');
        });
    });

    describe('PUT /api/v1/tasks/:id', () => {
        it('should update a task successfully', async () => {
            const updateData = {
                title: 'Updated Task Title',
                status: 'completed',
            };

            const res = await request(app)
                .put(`/api/v1/tasks/${testTask.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(res.statusCode).toEqual(200);
            expect(res.body.success).toBe(true);
            expect(res.body.message).toBe('Task updated successfully.');
            expect(res.body.task.id).toBe(testTask.id);
            expect(res.body.task.title).toBe(updateData.title);
            expect(res.body.task.status).toBe(updateData.status);

            const updatedTaskInDb = await taskRepository.findOneBy({ id: testTask.id });
            expect(updatedTaskInDb!.title).toBe(updateData.title);
            expect(updatedTaskInDb!.status).toBe(updateData.status);
        });

        it('should return 400 for invalid update data', async () => {
            const updateData = {
                status: 'invalid-status',
            };

            const res = await request(app)
                .put(`/api/v1/tasks/${testTask.id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData);

            expect(res.statusCode).toEqual(400);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Validation failed.');
        });

        it('should return 403 if user tries to update another user\'s task', async () => {
            const updateData = { title: 'Attempted update' };

            const res = await request(app)
                .put(`/api/v1/tasks/${testTask.id}`)
                .set('Authorization', `Bearer ${anotherAuthToken}`) // Another user's token
                .send(updateData);

            expect(res.statusCode).toEqual(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('You do not have permission to update this task.');
        });
    });

    describe('DELETE /api/v1/tasks/:id', () => {
        it('should delete a task successfully', async () => {
            const res = await request(app)
                .delete(`/api/v1/tasks/${testTask.id}`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(204); // No Content

            const taskInDb = await taskRepository.findOneBy({ id: testTask.id });
            expect(taskInDb).toBeNull();
        });

        it('should return 404 if task ID does not exist', async () => {
            const res = await request(app)
                .delete(`/api/v1/tasks/some-non-existent-uuid`)
                .set('Authorization', `Bearer ${authToken}`);

            expect(res.statusCode).toEqual(404);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('Task not found.');
        });

        it('should return 403 if user tries to delete another user\'s task', async () => {
            const res = await request(app)
                .delete(`/api/v1/tasks/${testTask.id}`)
                .set('Authorization', `Bearer ${anotherAuthToken}`); // Another user's token

            expect(res.statusCode).toEqual(403);
            expect(res.body.success).toBe(false);
            expect(res.body.message).toBe('You do not have permission to delete this task.');
        });
    });
});
```