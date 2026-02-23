```javascript
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const User = require('../../src/models/User');
const Project = require('../../src/models/Project');
const Task = require('../../src/models/Task');
const bcrypt = require('bcryptjs');

let mongoServer;
let adminUser, managerUser, devUser1, project1;

describe('Task Model Unit Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
    await Project.deleteMany({});
    await Task.deleteMany({});

    const hashedPassword = await bcrypt.hash('password123', 10);
    adminUser = await User.create({ username: 'admin', email: 'admin@test.com', password: hashedPassword, role: 'admin' });
    managerUser = await User.create({ username: 'manager', email: 'manager@test.com', password: hashedPassword, role: 'manager' });
    devUser1 = await User.create({ username: 'dev1', email: 'dev1@test.com', password: hashedPassword, role: 'developer' });

    project1 = await Project.create({
      name: 'Test Project 1',
      description: 'Description for Test Project 1',
      owner: managerUser._id,
      members: [{ user: managerUser._id, role: 'manager' }, { user: devUser1._id, role: 'developer' }],
    });
  });

  test('should create and save a task successfully', async () => {
    const taskData = {
      title: 'New Feature Implementation',
      description: 'Implement user login feature.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      status: 'To Do',
      priority: 'High',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };
    const validTask = new Task(taskData);
    const savedTask = await validTask.save();

    expect(savedTask._id).toBeDefined();
    expect(savedTask.title).toBe(taskData.title);
    expect(savedTask.projectId).toEqual(taskData.projectId);
    expect(savedTask.assignedTo).toEqual(taskData.assignedTo);
    expect(savedTask.status).toBe(taskData.status);
    expect(savedTask.priority).toBe(taskData.priority);
    expect(savedTask.createdAt).toBeDefined();
    expect(savedTask.updatedAt).toBeDefined();
    expect(savedTask.completedAt).toBeUndefined(); // Should not be set initially
  });

  test('should set completedAt when status changes to "Done"', async () => {
    const taskData = {
      title: 'Fix Bug X',
      description: 'Bug in authentication module.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      status: 'To Do',
      priority: 'Medium',
      dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    };
    const task = new Task(taskData);
    const savedTask = await task.save();

    savedTask.status = 'Done';
    const updatedTask = await savedTask.save();

    expect(updatedTask.status).toBe('Done');
    expect(updatedTask.completedAt).toBeDefined();
    expect(updatedTask.completedAt.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test('should clear completedAt when status changes from "Done" to other', async () => {
    const taskData = {
      title: 'Completed Task',
      description: 'This task was completed.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      status: 'Done',
      priority: 'Low',
      dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // Past due date
      completedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    };
    const task = new Task(taskData);
    const savedTask = await task.save();

    expect(savedTask.completedAt).toBeDefined();

    savedTask.status = 'In Progress';
    const updatedTask = await savedTask.save();

    expect(updatedTask.status).toBe('In Progress');
    expect(updatedTask.completedAt).toBeUndefined();
  });


  test('should fail if required fields are missing', async () => {
    const taskData = {
      description: 'Missing title, project ID, assignedTo, and due date.',
      // Missing: title, projectId, assignedTo, dueDate
    };
    const task = new Task(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should default status to "To Do" if not provided', async () => {
    const taskData = {
      title: 'Default Status Test',
      description: 'Test default status.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      priority: 'Medium',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    };
    const task = new Task(taskData);
    const savedTask = await task.save();
    expect(savedTask.status).toBe('To Do');
  });

  test('should default priority to "Medium" if not provided', async () => {
    const taskData = {
      title: 'Default Priority Test',
      description: 'Test default priority.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      status: 'To Do',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    };
    const task = new Task(taskData);
    const savedTask = await task.save();
    expect(savedTask.priority).toBe('Medium');
  });

  test('should fail if an invalid status is provided', async () => {
    const taskData = {
      title: 'Invalid Status',
      description: 'Test invalid status.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      status: 'InvalidStatus', // Invalid enum value
      priority: 'Medium',
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    };
    const task = new Task(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should fail if an invalid priority is provided', async () => {
    const taskData = {
      title: 'Invalid Priority',
      description: 'Test invalid priority.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      status: 'To Do',
      priority: 'Critical', // Invalid enum value
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
    };
    const task = new Task(taskData);
    await expect(task.save()).rejects.toThrow(mongoose.Error.ValidationError);
  });

  test('should populate assignedTo and projectId fields', async () => {
    const taskData = {
      title: 'Populate Test',
      description: 'Test population.',
      projectId: project1._id,
      assignedTo: devUser1._id,
      status: 'To Do',
      priority: 'Low',
      dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    };
    const task = new Task(taskData);
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedTo', 'username email')
      .populate('projectId', 'name');

    expect(populatedTask.assignedTo).toHaveProperty('username', devUser1.username);
    expect(populatedTask.assignedTo).toHaveProperty('email', devUser1.email);
    expect(populatedTask.projectId).toHaveProperty('name', project1.name);
  });
});
```