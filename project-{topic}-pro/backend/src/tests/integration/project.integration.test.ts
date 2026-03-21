```typescript
import 'reflect-metadata';
import { getRepository } from 'typeorm';
import { User, UserRole } from '@models/User';
import { Project, ProjectStatus } from '@models/Project';
import projectService from '@services/project.service';
import { AppDataSource } from '../../ormconfig';
import { hashPassword } from '@utils/password';
import AppError, { ErrorType } from '@utils/AppError';

// Silence logger for integration tests
jest.mock('@config/logger');

describe('ProjectService Integration Tests', () => {
  let admin: User;
  let manager: User;
  let regularUser: User;

  beforeEach(async () => {
    // Clear data from previous tests
    await AppDataSource.getRepository(Task).delete({});
    await AppDataSource.getRepository(Project).delete({});
    await AppDataSource.getRepository(User).delete({});

    const hashedPassword = await hashPassword('password123');

    admin = AppDataSource.getRepository(User).create({
      username: 'testadmin',
      email: 'testadmin@example.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    });
    await AppDataSource.getRepository(User).save(admin);

    manager = AppDataSource.getRepository(User).create({
      username: 'testmanager',
      email: 'testmanager@example.com',
      password: hashedPassword,
      role: UserRole.MANAGER,
    });
    await AppDataSource.getRepository(User).save(manager);

    regularUser = AppDataSource.getRepository(User).create({
      username: 'testuser',
      email: 'testuser@example.com',
      password: hashedPassword,
      role: UserRole.USER,
    });
    await AppDataSource.getRepository(User).save(regularUser);
  });

  afterEach(async () => {
    // Clean up after each test
    await AppDataSource.getRepository(Task).delete({});
    await AppDataSource.getRepository(Project).delete({});
    await AppDataSource.getRepository(User).delete({});
  });

  describe('createProject', () => {
    it('should create a project successfully', async () => {
      const projectData = {
        name: 'New Project',
        description: 'Description for new project',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31'),
        status: ProjectStatus.PLANNED,
        ownerId: regularUser.id,
      };

      const project = await projectService.createProject(projectData);

      expect(project).toBeDefined();
      expect(project.name).toBe('New Project');
      expect(project.owner.id).toBe(regularUser.id);

      const foundProject = await getRepository(Project).findOne({ where: { id: project.id }, relations: ['owner'] });
      expect(foundProject).toBeDefined();
      expect(foundProject?.name).toBe('New Project');
      expect(foundProject?.owner.id).toBe(regularUser.id);
    });

    it('should throw AppError if ownerId is invalid', async () => {
      const projectData = {
        name: 'Invalid Owner Project',
        description: 'Description for invalid owner project',
        startDate: new Date('2024-07-01'),
        endDate: new Date('2024-12-31'),
        status: ProjectStatus.PLANNED,
        ownerId: 'non-existent-uuid',
      };

      await expect(projectService.createProject(projectData)).rejects.toThrow(
        new AppError('Project owner not found.', ErrorType.BAD_REQUEST)
      );
    });
  });

  describe('getAllProjects', () => {
    let project1: Project;
    let project2: Project;

    beforeEach(async () => {
      project1 = await projectService.createProject({
        name: 'Project 1',
        description: 'Desc 1',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-02-01'),
        status: ProjectStatus.PLANNED,
        ownerId: regularUser.id,
      });

      project2 = await projectService.createProject({
        name: 'Project 2',
        description: 'Desc 2',
        startDate: new Date('2024-03-01'),
        endDate: new Date('2024-04-01'),
        status: ProjectStatus.IN_PROGRESS,
        ownerId: manager.id,
      });
    });

    it('should return all projects', async () => {
      const projects = await projectService.getAllProjects();
      expect(projects).toHaveLength(2);
      expect(projects.map(p => p.name)).toEqual(expect.arrayContaining(['Project 1', 'Project 2']));
    });

    it('should return projects owned by a specific user', async () => {
      const userProjects = await projectService.getAllProjects(regularUser.id);
      expect(userProjects).toHaveLength(1);
      expect(userProjects[0].name).toBe('Project 1');
      expect(userProjects[0].owner.id).toBe(regularUser.id);
    });
  });

  // Add more integration tests for getProjectById, updateProject, deleteProject
  // covering authorization logic (e.g., non-owner trying to update, admin trying to delete etc.)
});
```