const { sequelize, User, Project, MLTask } = require('../../src/db/sequelize');
const authService = require('../../src/services/auth.service');
const userService = require('../../src/services/user.service');
const projectService = require('../../src/services/project.service');
const mlTaskService = require('../../src/services/mlTask.service');
const AppError = require('../../src/utils/appError');
const mlMath = require('../../src/utils/ml-math');
const bcrypt = require('bcryptjs');

// Mock ml-math functions for MLTask service tests to avoid actual computation errors
jest.mock('../../src/utils/ml-math', () => ({
  min_max_scaling: jest.fn((input, params) => ({ scaled_data: 'mocked_scaled', ...params })),
  accuracy_score: jest.fn(() => ({ score: 0.9 })),
  // Mock other ml-math functions as needed
}));

describe('Services Unit Tests', () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Ensure clean tables for unit tests
  });

  beforeEach(async () => {
    // Clear all tables before each test
    await User.destroy({ truncate: true, cascade: true });
    await Project.destroy({ truncate: true, cascade: true });
    await MLTask.destroy({ truncate: true, cascade: true });
    // Reset mock calls
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // --- Auth Service Tests ---
  describe('Auth Service', () => {
    it('should register a new user', async () => {
      const user = await authService.registerUser('testuser', 'test@example.com', 'Password123!');
      expect(user).toBeDefined();
      expect(user.email).toBe('test@example.com');
      expect(await bcrypt.compare('Password123!', user.passwordHash)).toBe(true);
    });

    it('should throw error if email already exists during registration', async () => {
      await authService.registerUser('testuser', 'test@example.com', 'Password123!');
      await expect(
        authService.registerUser('anotheruser', 'test@example.com', 'AnotherPass123!')
      ).rejects.toThrow(AppError);
      await expect(
        authService.registerUser('anotheruser', 'test@example.com', 'AnotherPass123!')
      ).rejects.toThrow('User with that email already exists.');
    });

    it('should log in a user with correct credentials', async () => {
      const newUser = await authService.registerUser('testuser', 'test@example.com', 'Password123!');
      const user = await authService.loginUser('test@example.com', 'Password123!');
      expect(user).toBeDefined();
      expect(user.id).toBe(newUser.id);
    });

    it('should return null for incorrect login credentials', async () => {
      await authService.registerUser('testuser', 'test@example.com', 'Password123!');
      const user = await authService.loginUser('test@example.com', 'wrongpassword');
      expect(user).toBeNull();
    });

    it('should return null for non-existent user login', async () => {
      const user = await authService.loginUser('nonexistent@example.com', 'Password123!');
      expect(user).toBeNull();
    });
  });

  // --- User Service Tests ---
  describe('User Service', () => {
    let user1, user2;

    beforeEach(async () => {
      user1 = await User.create({
        username: 'userone',
        email: 'user1@example.com',
        passwordHash: 'hashedpassword1',
        role: 'user',
      });
      user2 = await User.create({
        username: 'usertwo',
        email: 'user2@example.com',
        passwordHash: 'hashedpassword2',
        role: 'admin',
      });
    });

    it('should retrieve all users without password hashes', async () => {
      const users = await userService.getAllUsers();
      expect(users.length).toBe(2);
      expect(users[0].passwordHash).toBeUndefined();
      expect(users[1].passwordHash).toBeUndefined();
      expect(users.map(u => u.email)).toEqual(expect.arrayContaining(['user1@example.com', 'user2@example.com']));
    });

    it('should retrieve a user by ID without password hash', async () => {
      const user = await userService.getUserById(user1.id);
      expect(user).toBeDefined();
      expect(user.id).toBe(user1.id);
      expect(user.passwordHash).toBeUndefined();
    });

    it('should return null for a non-existent user ID', async () => {
      const user = await userService.getUserById('non-existent-uuid');
      expect(user).toBeNull();
    });
  });

  // --- Project Service Tests ---
  describe('Project Service', () => {
    let user;

    beforeEach(async () => {
      user = await User.create({
        username: 'projectuser',
        email: 'project@example.com',
        passwordHash: 'Password123!',
      });
    });

    it('should create a new project', async () => {
      const project = await projectService.createProject('My First Project', 'A test project', user.id);
      expect(project).toBeDefined();
      expect(project.name).toBe('My First Project');
      expect(project.userId).toBe(user.id);
    });

    it('should throw error if user does not exist when creating project', async () => {
      await expect(
        projectService.createProject('Invalid Project', 'Description', 'non-existent-uuid')
      ).rejects.toThrow(AppError);
      await expect(
        projectService.createProject('Invalid Project', 'Description', 'non-existent-uuid')
      ).rejects.toThrow('User not found.');
    });

    it('should retrieve all projects for a specific user', async () => {
      await projectService.createProject('Project A', 'Desc A', user.id);
      await projectService.createProject('Project B', 'Desc B', user.id);
      const projects = await projectService.getAllProjects(user.id);
      expect(projects.length).toBe(2);
      expect(projects.map(p => p.name)).toEqual(expect.arrayContaining(['Project A', 'Project B']));
    });

    it('should retrieve a single project by ID for the owner', async () => {
      const newProject = await projectService.createProject('Single Project', 'Desc', user.id);
      const fetchedProject = await projectService.getProjectById(newProject.id, user.id);
      expect(fetchedProject).toBeDefined();
      expect(fetchedProject.id).toBe(newProject.id);
    });

    it('should return null if project ID is not found or not owned by user', async () => {
      const newProject = await projectService.createProject('Single Project', 'Desc', user.id);
      const anotherUser = await User.create({
        username: 'another',
        email: 'another@example.com',
        passwordHash: 'Password123!',
      });
      const fetchedProject = await projectService.getProjectById(newProject.id, anotherUser.id);
      expect(fetchedProject).toBeNull();
    });

    it('should update a project if owned by the user', async () => {
      const newProject = await projectService.createProject('Old Name', 'Old Desc', user.id);
      const updatedProject = await projectService.updateProject(newProject.id, user.id, {
        name: 'New Name',
        description: 'New Description',
      });
      expect(updatedProject).toBeDefined();
      expect(updatedProject.name).toBe('New Name');
      expect(updatedProject.description).toBe('New Description');
    });

    it('should return null if project not found or not owned by user during update', async () => {
      const newProject = await projectService.createProject('Old Name', 'Old Desc', user.id);
      const anotherUser = await User.create({
        username: 'another2',
        email: 'another2@example.com',
        passwordHash: 'Password123!',
      });
      const updatedProject = await projectService.updateProject(newProject.id, anotherUser.id, {
        name: 'Attempted Update',
      });
      expect(updatedProject).toBeNull();
    });

    it('should delete a project if owned by the user', async () => {
      const newProject = await projectService.createProject('To Delete', 'Desc', user.id);
      const isDeleted = await projectService.deleteProject(newProject.id, user.id);
      expect(isDeleted).toBe(true);
      const deletedProject = await Project.findByPk(newProject.id);
      expect(deletedProject).toBeNull();
    });

    it('should return false if project not found or not owned by user during delete', async () => {
      const newProject = await projectService.createProject('To Delete', 'Desc', user.id);
      const anotherUser = await User.create({
        username: 'another3',
        email: 'another3@example.com',
        passwordHash: 'Password123!',
      });
      const isDeleted = await projectService.deleteProject(newProject.id, anotherUser.id);
      expect(isDeleted).toBe(false);
    });
  });

  // --- MLTask Service Tests ---
  describe('MLTask Service', () => {
    let user, project;

    beforeEach(async () => {
      user = await User.create({
        username: 'mltaskuser',
        email: 'mltask@example.com',
        passwordHash: 'Password123!',
      });
      project = await projectService.createProject('ML Tasks Project', 'For testing ML tasks', user.id);
    });

    it('should create and execute an ML task successfully', async () => {
      const inputData = { data: [{ a: 1 }] };
      const parameters = { column: 'a' };
      const mlTask = await mlTaskService.createAndExecuteMLTask(
        project.id,
        user.id,
        'min_max_scaling',
        inputData,
        parameters
      );

      expect(mlTask).toBeDefined();
      expect(mlTask.projectId).toBe(project.id);
      expect(mlTask.type).toBe('min_max_scaling');
      expect(mlTask.status).toBe('completed');
      expect(mlTask.inputData).toEqual(inputData);
      expect(mlTask.parameters).toEqual(parameters);
      expect(mlTask.outputData).toEqual({ scaled_data: 'mocked_scaled', column: 'a' });
      expect(mlMath.min_max_scaling).toHaveBeenCalledWith(inputData, parameters);
    });

    it('should set task status to "failed" if ml-math function throws an error', async () => {
      // Mock mlMath.min_max_scaling to throw an error for this test
      mlMath.min_max_scaling.mockImplementationOnce(() => {
        throw new AppError('Mocked ML error', 400);
      });

      const inputData = { data: [{ a: 'invalid' }] }; // Malformed input
      const parameters = { column: 'a' };
      const mlTask = await mlTaskService.createAndExecuteMLTask(
        project.id,
        user.id,
        'min_max_scaling',
        inputData,
        parameters
      );

      expect(mlTask).toBeDefined();
      expect(mlTask.status).toBe('failed');
      expect(mlTask.outputData).toEqual({ error: 'Mocked ML error' });
      expect(mlMath.min_max_scaling).toHaveBeenCalledWith(inputData, parameters);
    });

    it('should throw AppError if project not found or not owned by user during task creation', async () => {
      const anotherUser = await User.create({
        username: 'mltaskuser2',
        email: 'mltask2@example.com',
        passwordHash: 'Password123!',
      });
      await expect(
        mlTaskService.createAndExecuteMLTask(
          project.id,
          anotherUser.id, // Wrong user ID
          'min_max_scaling',
          { data: [{ a: 1 }] },
          { column: 'a' }
        )
      ).rejects.toThrow(AppError);
      await expect(
        mlTaskService.createAndExecuteMLTask(
          project.id,
          anotherUser.id,
          'min_max_scaling',
          { data: [{ a: 1 }] },
          { column: 'a' }
        )
      ).rejects.toThrow('Project not found or you do not have permission to access it.');
    });

    it('should retrieve all ML tasks for a specific project and user', async () => {
      await mlTaskService.createAndExecuteMLTask(project.id, user.id, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      await mlTaskService.createAndExecuteMLTask(project.id, user.id, 'accuracy_score', { y_true: [1], y_pred: [1] }, {});

      const mlTasks = await mlTaskService.getAllMLTasks(project.id, user.id);
      expect(mlTasks.length).toBe(2);
      expect(mlTasks.map(t => t.type)).toEqual(expect.arrayContaining(['min_max_scaling', 'accuracy_score']));
    });

    it('should retrieve a single ML task by ID for the owner', async () => {
      const newMlTask = await mlTaskService.createAndExecuteMLTask(project.id, user.id, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      const fetchedMlTask = await mlTaskService.getMLTaskById(project.id, newMlTask.id, user.id);
      expect(fetchedMlTask).toBeDefined();
      expect(fetchedMlTask.id).toBe(newMlTask.id);
    });

    it('should return null if ML task ID is not found or not owned by user', async () => {
      const newMlTask = await mlTaskService.createAndExecuteMLTask(project.id, user.id, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      const anotherUser = await User.create({
        username: 'anotherTaskUser',
        email: 'another_task@example.com',
        passwordHash: 'Password123!',
      });
      const fetchedMlTask = await mlTaskService.getMLTaskById(project.id, newMlTask.id, anotherUser.id);
      expect(fetchedMlTask).toBeNull();
    });

    it('should delete an ML task if owned by the user', async () => {
      const newMlTask = await mlTaskService.createAndExecuteMLTask(project.id, user.id, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      const isDeleted = await mlTaskService.deleteMLTask(project.id, newMlTask.id, user.id);
      expect(isDeleted).toBe(true);
      const deletedMlTask = await MLTask.findByPk(newMlTask.id);
      expect(deletedMlTask).toBeNull();
    });

    it('should return false if ML task not found or not owned by user during delete', async () => {
      const newMlTask = await mlTaskService.createAndExecuteMLTask(project.id, user.id, 'min_max_scaling', { data: [{ a: 1 }] }, { column: 'a' });
      const anotherUser = await User.create({
        username: 'anotherTaskUser2',
        email: 'another_task2@example.com',
        passwordHash: 'Password123!',
      });
      const isDeleted = await mlTaskService.deleteMLTask(project.id, newMlTask.id, anotherUser.id);
      expect(isDeleted).toBe(false);
    });
  });
});