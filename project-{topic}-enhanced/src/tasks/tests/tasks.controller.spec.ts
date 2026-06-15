```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from '../tasks.controller';
import { TasksService } from '../tasks.service';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { User } from '../../users/entities/user.entity';
import { Task } from '../entities/task.entity';
import { TaskStatus } from '../enum/task-status.enum';
import { TaskPriority } from '../enum/task-priority.enum';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { GetTasksFilterDto } from '../dto/get-tasks-filter.dto';
import { CustomLogger } from '../../common/logger/custom-logger';

describe('TasksController', () => {
  let controller: TasksController;
  let service: TasksService;
  let mockUser: User;
  let mockTask: Task;

  const mockTasksService = {
    createTask: jest.fn(),
    getTasks: jest.fn(),
    getTaskById: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn(),
  };

  beforeEach(async () => {
    mockUser = {
      id: 1,
      username: 'testuser',
      password: 'hashedpassword',
      tasks: [],
      categories: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockTask = {
      id: 1,
      title: 'Test Task',
      description: 'Test Description',
      status: TaskStatus.OPEN,
      priority: TaskPriority.MEDIUM,
      dueDate: null,
      user: mockUser,
      category: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [
        {
          provide: TasksService,
          useValue: mockTasksService,
        },
        {
          provide: CustomLogger, // Provide CustomLogger
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<TasksController>(TasksController);
    service = module.get<TasksService>(TasksService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a task', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        description: 'New Description',
      };
      mockTasksService.createTask.mockResolvedValue(mockTask);

      expect(await controller.create(createDto, mockUser)).toEqual(mockTask);
      expect(mockTasksService.createTask).toHaveBeenCalledWith(createDto, mockUser);
    });

    it('should throw NotFoundException if category does not exist for user', async () => {
      const createDto: CreateTaskDto = {
        title: 'New Task',
        categoryId: 999,
      };
      mockTasksService.createTask.mockRejectedValue(
        new NotFoundException('Category with ID "999" not found or does not belong to you.'),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of tasks', async () => {
      mockTasksService.getTasks.mockResolvedValue([mockTask]);
      const filterDto: GetTasksFilterDto = {};

      expect(await controller.findAll(filterDto, mockUser)).toEqual([mockTask]);
      expect(mockTasksService.getTasks).toHaveBeenCalledWith(filterDto, mockUser);
    });

    it('should filter tasks by status', async () => {
      mockTasksService.getTasks.mockResolvedValue([mockTask]);
      const filterDto: GetTasksFilterDto = { status: TaskStatus.OPEN };

      expect(await controller.findAll(filterDto, mockUser)).toEqual([mockTask]);
      expect(mockTasksService.getTasks).toHaveBeenCalledWith(filterDto, mockUser);
    });
  });

  describe('findOne', () => {
    it('should return a single task', async () => {
      mockTasksService.getTaskById.mockResolvedValue(mockTask);

      expect(await controller.findOne(1, mockUser)).toEqual(mockTask);
      expect(mockTasksService.getTaskById).toHaveBeenCalledWith(1, mockUser);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTasksService.getTaskById.mockRejectedValue(
        new NotFoundException('Task with ID "999" not found.'),
      );

      await expect(controller.findOne(999, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a task', async () => {
      const updateDto: UpdateTaskDto = { title: 'Updated Task' };
      const updatedTask = { ...mockTask, title: 'Updated Task' };
      mockTasksService.updateTask.mockResolvedValue(updatedTask);

      expect(await controller.update(1, updateDto, mockUser)).toEqual(updatedTask);
      expect(mockTasksService.updateTask).toHaveBeenCalledWith(1, updateDto, mockUser);
    });

    it('should throw NotFoundException if task not found', async () => {
      const updateDto: UpdateTaskDto = { title: 'Updated Task' };
      mockTasksService.updateTask.mockRejectedValue(
        new NotFoundException('Task with ID "999" not found.'),
      );

      await expect(controller.update(999, updateDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for invalid status', async () => {
      const updateDto: UpdateTaskDto = { status: 'INVALID_STATUS' as TaskStatus };
      mockTasksService.updateTask.mockRejectedValue(
        new BadRequestException('Invalid status: INVALID_STATUS'),
      );

      await expect(controller.update(1, updateDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a task', async () => {
      mockTasksService.deleteTask.mockResolvedValue(undefined); // deleteTask returns void

      await expect(controller.remove(1, mockUser)).resolves.toBeUndefined();
      expect(mockTasksService.deleteTask).toHaveBeenCalledWith(1, mockUser);
    });

    it('should throw NotFoundException if task not found', async () => {
      mockTasksService.deleteTask.mockRejectedValue(
        new NotFoundException('Task with ID "999" not found.'),
      );

      await expect(controller.remove(999, mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
```