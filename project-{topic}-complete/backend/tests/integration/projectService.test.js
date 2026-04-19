const sequelize = require('../../src/config/database');
const Project = require('../../src/models/project');
const User = require('../../src/models/user');
const projectService = require('../../src/services/projectService');
const { v4: uuidv4 } = require('uuid');

describe('Project Service Integration Tests', () => {
  let testUser;

  beforeAll(async () => {
    // Connect to the test database and sync models
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // Clear and re-create tables for tests

    // Create a test user
    testUser = await User.create({
      id: uuidv4(),
      username: 'test_user_project_service',
      email: 'test_project_service@example.com',
      password: 'testpassword123',
      role: 'user'
    });
  });

  afterAll(async () => {
    // Clean up test data and close database connection
    await sequelize.drop();
    await sequelize.close();
  });

  beforeEach(async () => {
    // Clear projects before each test
    await Project.destroy({ truncate: true, cascade: true });
  });

  it('should create a new project', async () => {
    const projectData = {
      name: 'New Test Project',
      description: 'Description for new test project',
      ownerId: testUser.id,
      status: 'active'
    };
    const project = await projectService.createProject(projectData);

    expect(project).toBeDefined();
    expect(project.name).toBe('New Test Project');
    expect(project.ownerId).toBe(testUser.id);

    const foundProject = await Project.findByPk(project.id);
    expect(foundProject).toBeDefined();
    expect(foundProject.name).toBe('New Test Project');
  });

  it('should retrieve all projects for a user', async () => {
    await projectService.createProject({
      name: 'User Project 1',
      description: 'Desc 1',
      ownerId: testUser.id,
      status: 'active'
    });
    await projectService.createProject({
      name: 'User Project 2',
      description: 'Desc 2',
      ownerId: testUser.id,
      status: 'on-hold'
    });

    const projects = await projectService.getAllProjects(testUser.id);
    expect(projects).toBeDefined();
    expect(projects.length).toBe(2);
    expect(projects[0].name).toMatch(/User Project/);
  });

  it('should retrieve a project by ID', async () => {
    const createdProject = await projectService.createProject({
      name: 'Specific Project',
      description: 'Retrieve me',
      ownerId: testUser.id,
      status: 'active'
    });

    const foundProject = await projectService.getProjectById(createdProject.id, testUser.id);
    expect(foundProject).toBeDefined();
    expect(foundProject.name).toBe('Specific Project');
    expect(foundProject.ownerId).toBe(testUser.id);
  });

  it('should update a project', async () => {
    const createdProject = await projectService.createProject({
      name: 'Project to Update',
      description: 'Initial description',
      ownerId: testUser.id,
      status: 'active'
    });

    const updatedData = {
      name: 'Updated Project Name',
      status: 'completed'
    };

    const updatedProject = await projectService.updateProject(createdProject.id, updatedData, testUser.id);
    expect(updatedProject).toBeDefined();
    expect(updatedProject.name).toBe('Updated Project Name');
    expect(updatedProject.status).toBe('completed');

    const foundProject = await Project.findByPk(createdProject.id);
    expect(foundProject.name).toBe('Updated Project Name');
  });

  it('should delete a project', async () => {
    const createdProject = await projectService.createProject({
      name: 'Project to Delete',
      description: 'Delete me',
      ownerId: testUser.id,
      status: 'active'
    });

    await projectService.deleteProject(createdProject.id, testUser.id);

    const foundProject = await Project.findByPk(createdProject.id);
    expect(foundProject).toBeNull();
  });

  it('should return null if project not found for getProjectById', async () => {
    const nonExistentId = uuidv4();
    const project = await projectService.getProjectById(nonExistentId, testUser.id);
    expect(project).toBeNull();
  });

  it('should throw error if user tries to update another user\'s project', async () => {
    const otherUser = await User.create({
      id: uuidv4(),
      username: 'other_user',
      email: 'other@example.com',
      password: 'password',
      role: 'user'
    });
    const projectByOther = await projectService.createProject({
      name: 'Other Users Project',
      description: 'Belongs to other user',
      ownerId: otherUser.id,
      status: 'active'
    });

    const updatedData = { name: 'Attempted Update' };
    await expect(projectService.updateProject(projectByOther.id, updatedData, testUser.id))
      .rejects.toThrow('Project not found or user is not the owner.');
  });
});