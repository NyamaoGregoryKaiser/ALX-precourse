import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from './tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Task } from './entities/task.entity';
import { Repository } from 'typeorm';
import { ProjectsService } from '../projects/projects.service';
import { UsersService } from '../users/users.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TaskStatus } from './enums/task-status.enum';
import { UserRole } from '../users/enums/user-role.enum';
import { LoggerService } from '../utils/logger';

/**
 * Unit tests for `TasksService`.
 * Focuses on testing the business logic of task service in isolation,
 * mocking its dependencies (TypeORM Repository, ProjectsService, UsersService, LoggerService).
 */
describe('TasksService', () => {
  let service: TasksService;
  let tasksRepository: Repository<Task>;
  let projectsService: ProjectsService;
  let usersService: UsersService;
  let loggerService: LoggerService;

  // Mock data
  const mockUser: any = {
    id: 'user-id-1',
    username: 'testuser',
    email: 'user@example.com',
    roles: [UserRole.USER],
  };

  const mockAdminUser: any = {
    id: 'admin-id-1',
    username: 'adminuser',
    email: 'admin@example.com',
    roles: [UserRole.ADMIN],
  };

  const mockProject: any = {
    id: 'project-id-1',
    name: 'Test Project',
    owner: mockUser,
    ownerId: mockUser.id,
  };

  const mockTask: any = {
    id: 'task-id-1',
    title: 'Test Task',
    description: 'Task description',
    status: TaskStatus.TODO,
    priority: 1,
    dueDate: new Date(),
    project: mockProject,
    projectId: mockProject.id,
    assignedTo: mockUser,
    assignedToId: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Mock implementations for dependencies
  const mockTaskRepository = {
    create: jest.fn((dto) => dto),
    save: jest.fn((task) => Promise.resolve({ id: 'new-task-id', ...task })),
    findOne: jest.fn(() => Promise.resolve(mockTask)),
    find: jest.fn(() => Promise.resolve([mockTask])),
    merge: jest.fn((entity, dto) => Object.assign(entity, dto)),
    remove: jest.fn(() => Promise.resolve({ affected: 1 })),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn(() => Promise.resolve([mockTask])),
    })),
  };

  const mockProjectsService = {
    findOne: jest.fn((id, user) =>
      id === mockProject.id && user.id === mockUser.id
        ? Promise.resolve(mockProject)
        : Promise.resolve(null),
    ),
  };

  const mockUsersService = {
    findOne: jest.fn((id) =>
      id === mockUser.id ? Promise.resolve(mockUser) : Promise.resolve(null),
    ),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    verbose: jest.fn(),
  };

  // Setup before each test
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: ProjectsService,
          useValue: mockProjectsService,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: LoggerService,
          useValue: mockLoggerService,
        },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
    tasksRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    projectsService = module.get<ProjectsService>(ProjectsService);
    usersService = module.get<UsersService>(UsersService);
    loggerService = module.get<LoggerService>(LoggerService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createTaskDto = {
      title: 'New Task',
      description: 'Description for new task',
      projectId: mockProject.id,
      assignedToId: mockUser.id,
      status: TaskStatus.TODO,
      priority: 0,
      dueDate: new Date().toISOString(),
    };

    it('should successfully create a new task', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockTaskRepository.save.mockResolvedValue({
        id: 'new-task-id',
        ...createTaskDto,
        project: mockProject,
        assignedTo: mockUser,
      });

      const result = await service.create(createTaskDto, mockUser);
      expect(result).toHaveProperty('id', 'new-task-id');
      expect(result.title).toBe(createTaskDto.title);
      expect(result.project.id).toBe(createTaskDto.projectId);
      expect(result.assignedTo.id).toBe(createTaskDto.assignedToId);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(createTaskDto.projectId, mockUser);
      expect(mockUsersService.findOne).toHaveBeenCalledWith(createTaskDto.assignedToId);
      expect(tasksRepository.create).toHaveBeenCalled();
      expect(tasksRepository.save).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) attempting to create task for project ${createTaskDto.projectId}.`,
      );
    });

    it('should assign task to project owner if assignedToId is not provided', async () => {
      const dtoWithoutAssignedToId = { ...createTaskDto };
      delete dtoWithoutAssignedToId.assignedToId;

      mockProjectsService.findOne.mockResolvedValue(mockProject); // Project has an owner (mockUser)
      mockTaskRepository.save.mockResolvedValue({
        id: 'new-task-id',
        ...dtoWithoutAssignedToId,
        project: mockProject,
        assignedTo: mockProject.owner, // Should be assigned to project owner
      });

      const result = await service.create(dtoWithoutAssignedToId, mockUser);
      expect(result.assignedTo.id).toBe(mockProject.owner.id);
      expect(mockUsersService.findOne).not.toHaveBeenCalledWith(undefined); // Should not call findOne with undefined
    });

    it('should throw NotFoundException if project does not exist', async () => {
      mockProjectsService.findOne.mockResolvedValue(null);
      await expect(service.create(createTaskDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) attempting to create task for project ${createTaskDto.projectId}.`,
      );
    });

    it('should throw NotFoundException if assigned user does not exist', async () => {
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockUsersService.findOne.mockResolvedValue(null); // Assigned user not found
      await expect(
        service.create({ ...createTaskDto, assignedToId: 'non-existent-user' }, mockUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('non-existent-user');
    });

    it('should throw ForbiddenException if user has no access to project', async () => {
      mockProjectsService.findOne.mockImplementation(() => {
        throw new ForbiddenException('No access to project');
      });
      await expect(service.create(createTaskDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all tasks for an Admin user', async () => {
      const mockTasks = [mockTask, { ...mockTask, id: 'task-id-2', project: { ...mockProject, id: 'project-id-2', owner: mockAdminUser } }];
      (tasksRepository.createQueryBuilder().getMany as jest.Mock).mockResolvedValue(mockTasks);

      const result = await service.findAll(mockAdminUser);
      expect(result).toEqual(mockTasks);
      expect(tasksRepository.createQueryBuilder).toHaveBeenCalled();
      expect(tasksRepository.createQueryBuilder().where).not.toHaveBeenCalled(); // Admins see all
      expect(loggerService.log).toHaveBeenCalledWith(
        `User ${mockAdminUser.username} (ID: ${mockAdminUser.id}) fetching all tasks.`,
      );
    });

    it('should return tasks owned by the user or assigned to the user for a regular user', async () => {
      const mockUserOwnedTask = { ...mockTask, id: 'task-id-1', project: mockProject, assignedTo: mockUser };
      const mockUserAssignedTask = { ...mockTask, id: 'task-id-2', project: { ...mockProject, owner: { id: 'other-user' } }, assignedTo: mockUser };
      (tasksRepository.createQueryBuilder().getMany as jest.Mock).mockResolvedValue([mockUserOwnedTask, mockUserAssignedTask]);

      const result = await service.findAll(mockUser);
      expect(result).toEqual([mockUserOwnedTask, mockUserAssignedTask]);
      expect(tasksRepository.createQueryBuilder).toHaveBeenCalled();
      expect(tasksRepository.createQueryBuilder().where).toHaveBeenCalledWith(
        'project.ownerId = :userId OR assignedTo.id = :userId',
        { userId: mockUser.id },
      );
      expect(loggerService.log).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) fetching all tasks.`,
      );
    });
  });

  describe('findOne', () => {
    it('should return a task if user is owner', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask); // mockTask owned by mockUser

      const result = await service.findOne(mockTask.id, mockUser);
      expect(result).toEqual(mockTask);
      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        relations: ['project', 'assignedTo', 'project.owner'],
      });
      expect(loggerService.log).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) fetching task with ID: ${mockTask.id}.`,
      );
    });

    it('should return a task if user is assigned', async () => {
      const assignedTask = { ...mockTask, project: { ...mockProject, owner: { id: 'other-owner' } }, assignedTo: mockUser };
      mockTaskRepository.findOne.mockResolvedValue(assignedTask);

      const result = await service.findOne(assignedTask.id, mockUser);
      expect(result).toEqual(assignedTask);
    });

    it('should return a task if user is Admin', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      const result = await service.findOne(mockTask.id, mockAdminUser);
      expect(result).toEqual(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);
      await expect(service.findOne('non-existent-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        `Task with ID non-existent-id not found.`,
      );
    });

    it('should throw ForbiddenException if user has no access', async () => {
      const nonAccessibleTask = { ...mockTask, project: { ...mockProject, owner: { id: 'other-owner' } }, assignedTo: { id: 'other-assigned' } };
      mockTaskRepository.findOne.mockResolvedValue(nonAccessibleTask);

      await expect(service.findOne(nonAccessibleTask.id, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) forbidden from accessing task ${nonAccessibleTask.id}.`,
      );
    });
  });

  describe('update', () => {
    const updateTaskDto = {
      title: 'Updated Task Title',
      status: TaskStatus.DONE,
    };

    it('should successfully update a task if user is owner', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, ...updateTaskDto });

      const result = await service.update(mockTask.id, updateTaskDto, mockUser);
      expect(result).toHaveProperty('title', updateTaskDto.title);
      expect(result).toHaveProperty('status', updateTaskDto.status);
      expect(tasksRepository.merge).toHaveBeenCalledWith(mockTask, updateTaskDto);
      expect(tasksRepository.save).toHaveBeenCalled();
      expect(loggerService.log).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) attempting to update task with ID: ${mockTask.id}.`,
      );
    });

    it('should successfully update a task if user is assigned', async () => {
      const assignedTask = { ...mockTask, project: { ...mockProject, owner: { id: 'other-owner' } }, assignedTo: mockUser };
      mockTaskRepository.findOne.mockResolvedValue(assignedTask);
      mockTaskRepository.save.mockResolvedValue({ ...assignedTask, ...updateTaskDto });

      const result = await service.update(assignedTask.id, updateTaskDto, mockUser);
      expect(result).toHaveProperty('title', updateTaskDto.title);
    });

    it('should successfully update a task if user is Admin', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.save.mockResolvedValue({ ...mockTask, ...updateTaskDto });

      const result = await service.update(mockTask.id, updateTaskDto, mockAdminUser);
      expect(result).toHaveProperty('title', updateTaskDto.title);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);
      await expect(service.update('non-existent-id', updateTaskDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        `Task with ID non-existent-id not found for update.`,
      );
    });

    it('should throw ForbiddenException if user has no access', async () => {
      const nonAccessibleTask = { ...mockTask, project: { ...mockProject, owner: { id: 'other-owner' } }, assignedTo: { id: 'other-assigned' } };
      mockTaskRepository.findOne.mockResolvedValue(nonAccessibleTask);

      await expect(service.update(nonAccessibleTask.id, updateTaskDto, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) forbidden from updating task ${nonAccessibleTask.id}.`,
      );
    });

    it('should throw NotFoundException if new project for task does not exist', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProjectsService.findOne.mockResolvedValue(null); // New project not found

      await expect(
        service.update(mockTask.id, { ...updateTaskDto, projectId: 'non-existent-project' }, mockUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockProjectsService.findOne).toHaveBeenCalledWith(
        'non-existent-project',
        mockUser,
      );
    });

    it('should throw BadRequestException if new assigned user for task does not exist', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockProjectsService.findOne.mockResolvedValue(mockProject);
      mockUsersService.findOne.mockResolvedValue(null); // New assigned user not found

      await expect(
        service.update(mockTask.id, { ...updateTaskDto, assignedToId: 'non-existent-user' }, mockUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockUsersService.findOne).toHaveBeenCalledWith('non-existent-user');
    });
  });

  describe('remove', () => {
    it('should successfully delete a task if user is project owner', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(mockTask.id, mockUser)).resolves.toBeUndefined();
      expect(tasksRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockTask.id },
        relations: ['project', 'project.owner'],
      });
      expect(tasksRepository.remove).toHaveBeenCalledWith(mockTask);
      expect(loggerService.log).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) attempting to remove task with ID: ${mockTask.id}.`,
      );
    });

    it('should successfully delete a task if user is Admin', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);
      mockTaskRepository.remove.mockResolvedValue(undefined);

      await expect(service.remove(mockTask.id, mockAdminUser)).resolves.toBeUndefined();
      expect(tasksRepository.remove).toHaveBeenCalledWith(mockTask);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);
      await expect(service.remove('non-existent-id', mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        `Task with ID non-existent-id not found for deletion.`,
      );
    });

    it('should throw ForbiddenException if user has no access (not owner or admin)', async () => {
      const nonAccessibleTask = { ...mockTask, project: { ...mockProject, owner: { id: 'other-owner' } } };
      mockTaskRepository.findOne.mockResolvedValue(nonAccessibleTask);

      await expect(service.remove(nonAccessibleTask.id, mockUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(loggerService.warn).toHaveBeenCalledWith(
        `User ${mockUser.username} (ID: ${mockUser.id}) forbidden from deleting task ${nonAccessibleTask.id}.`,
      );
    });
  });
});