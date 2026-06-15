```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { TasksService } from '../tasks.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { User } from '../../users/entities/user.entity';
import { CreateTaskDto } from '../dto/create-task.dto';
import { UpdateTaskDto } from '../dto/update-task.dto';
import { TaskStatus } from '../enum/task-status.enum';
import { TaskPriority } from '../enum/task-priority.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CategoriesService } from '../../categories/categories.service';
import { Category } from '../../categories/entities/category.entity';
import { GetTasksFilterDto } from '../dto/get-tasks-filter.dto';
import { CustomLogger } from '../../common/logger/custom-logger';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepository: Repository<Task>;
  let categoriesService: CategoriesService;
  let mockUser: User;
  let mockCategory: Category;
  let mockTask: Task;

  const mockTaskRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
    delete: jest.fn(),
  };

  const mockCategoriesService = {
    getCategoryById: jest.fn(),
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
    mockCategory = {
      id: 10,
      name: 'Work',
      description: 'Work-related tasks',
      user: mockUser,
      tasks: [],
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
      providers: [
        TasksService,
        {
          provide: getRepositoryToken(Task),
          useValue: mockTaskRepository,
        },
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
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

    service = module.get<TasksService>(TasksService);
    taskRepository = module.get<Repository<Task>>(getRepositoryToken(Task));
    categoriesService = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTask', () => {
    const createDto: CreateTaskDto = {
      title: 'New Task',
      description: 'Details',
      status: TaskStatus.OPEN,
      priority: TaskPriority.HIGH,
    };

    it('should successfully create a task without category', async () => {
      mockTaskRepository.create.mockReturnValue(mockTask);
      mockTaskRepository.save.mockResolvedValue(mockTask);
      mockCategoriesService.getCategoryById.mockResolvedValue(null); // No categoryId provided

      const result = await service.createTask(createDto, mockUser);
      expect(result).toEqual(mockTask);
      expect(mockTaskRepository.create).toHaveBeenCalledWith({
        ...createDto,
        status: TaskStatus.OPEN,
        priority: TaskPriority.HIGH,
        user: mockUser,
        category: null,
      });
      expect(mockTaskRepository.save).toHaveBeenCalledWith(mockTask);
      expect(mockCategoriesService.getCategoryById).not.toHaveBeenCalled();
    });

    it('should successfully create a task with an existing category', async () => {
      const createDtoWithCategory = { ...createDto, categoryId: mockCategory.id };
      mockCategoriesService.getCategoryById.mockResolvedValue(mockCategory);
      const taskWithCategory = { ...mockTask, category: mockCategory };
      mockTaskRepository.create.mockReturnValue(taskWithCategory);
      mockTaskRepository.save.mockResolvedValue(taskWithCategory);

      const result = await service.createTask(createDtoWithCategory, mockUser);
      expect(result).toEqual(taskWithCategory);
      expect(mockCategoriesService.getCategoryById).toHaveBeenCalledWith(
        mockCategory.id,
        mockUser,
      );
      expect(mockTaskRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          category: mockCategory,
        }),
      );
      expect(mockTaskRepository.save).toHaveBeenCalledWith(taskWithCategory);
    });

    it('should throw NotFoundException if category does not exist for the user', async () => {
      const createDtoWithInvalidCategory = { ...createDto, categoryId: 999 };
      mockCategoriesService.getCategoryById.mockResolvedValue(null); // Category not found or not for user

      await expect(
        service.createTask(createDtoWithInvalidCategory, mockUser),
      ).rejects.toThrow(NotFoundException);
      expect(mockCategoriesService.getCategoryById).toHaveBeenCalledWith(
        999,
        mockUser,
      );
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getTasks', () => {
    it('should return all tasks for a user', async () => {
      const tasks = [mockTask];
      mockTaskRepository.createQueryBuilder().getMany.mockResolvedValue(tasks);

      const result = await service.getTasks({}, mockUser);
      expect(result).toEqual(tasks);
      expect(mockTaskRepository.createQueryBuilder).toHaveBeenCalled();
      expect(
        mockTaskRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('task.userId = :userId', { userId: mockUser.id });
      expect(mockTaskRepository.createQueryBuilder().getMany).toHaveBeenCalled();
    });

    it('should filter tasks by status', async () => {
      const tasks = [mockTask];
      mockTaskRepository.createQueryBuilder().getMany.mockResolvedValue(tasks);

      const filterDto: GetTasksFilterDto = { status: TaskStatus.OPEN };
      await service.getTasks(filterDto, mockUser);
      expect(
        mockTaskRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('task.status = :status', { status: TaskStatus.OPEN });
    });

    it('should filter tasks by priority', async () => {
      const tasks = [mockTask];
      mockTaskRepository.createQueryBuilder().getMany.mockResolvedValue(tasks);

      const filterDto: GetTasksFilterDto = { priority: TaskPriority.HIGH };
      await service.getTasks(filterDto, mockUser);
      expect(
        mockTaskRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('task.priority = :priority', { priority: TaskPriority.HIGH });
    });

    it('should filter tasks by categoryId', async () => {
      const tasks = [mockTask];
      mockTaskRepository.createQueryBuilder().getMany.mockResolvedValue(tasks);

      const filterDto: GetTasksFilterDto = { categoryId: mockCategory.id };
      await service.getTasks(filterDto, mockUser);
      expect(
        mockTaskRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('task.categoryId = :categoryId', {
        categoryId: mockCategory.id,
      });
    });

    it('should filter tasks by search term', async () => {
      const tasks = [mockTask];
      mockTaskRepository.createQueryBuilder().getMany.mockResolvedValue(tasks);

      const filterDto: GetTasksFilterDto = { search: 'test' };
      await service.getTasks(filterDto, mockUser);
      expect(
        mockTaskRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith(
        '(LOWER(task.title) LIKE LOWER(:search) OR LOWER(task.description) LIKE LOWER(:search))',
        { search: `%test%` },
      );
    });

    it('should filter tasks by dueDateBefore', async () => {
      const tasks = [mockTask];
      mockTaskRepository.createQueryBuilder().getMany.mockResolvedValue(tasks);
      const date = new Date();

      const filterDto: GetTasksFilterDto = { dueDateBefore: date };
      await service.getTasks(filterDto, mockUser);
      expect(
        mockTaskRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('task.dueDate <= :dueDateBefore', { dueDateBefore: date });
    });
  });

  describe('getTaskById', () => {
    it('should return a task by ID for the user', async () => {
      mockTaskRepository.findOne.mockResolvedValue(mockTask);

      const result = await service.getTaskById(1, mockUser);
      expect(result).toEqual(mockTask);
      expect(mockTaskRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, user: { id: mockUser.id } },
        relations: ['category'],
      });
    });

    it('should throw NotFoundException if task not found for user', async () => {
      mockTaskRepository.findOne.mockResolvedValue(null);

      await expect(service.getTaskById(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateTask', () => {
    it('should update task title and description', async () => {
      const existingTask = { ...mockTask };
      const updatedTask = { ...mockTask, title: 'Updated', description: 'Updated Desc' };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);

      const updateDto: UpdateTaskDto = { title: 'Updated', description: 'Updated Desc' };
      const result = await service.updateTask(1, updateDto, mockUser);
      expect(result).toEqual(updatedTask);
      expect(service.getTaskById).toHaveBeenCalledWith(1, mockUser);
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated', description: 'Updated Desc' }),
      );
    });

    it('should update task status', async () => {
      const existingTask = { ...mockTask };
      const updatedTask = { ...mockTask, status: TaskStatus.DONE };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);

      const updateDto: UpdateTaskDto = { status: TaskStatus.DONE };
      const result = await service.updateTask(1, updateDto, mockUser);
      expect(result).toEqual(updatedTask);
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TaskStatus.DONE }),
      );
    });

    it('should update task priority', async () => {
      const existingTask = { ...mockTask };
      const updatedTask = { ...mockTask, priority: TaskPriority.HIGH };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTask);
      mockTaskRepository.save.mockResolvedValue(updatedTask);

      const updateDto: UpdateTaskDto = { priority: TaskPriority.HIGH };
      const result = await service.updateTask(1, updateDto, mockUser);
      expect(result).toEqual(updatedTask);
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ priority: TaskPriority.HIGH }),
      );
    });

    it('should unassign category if categoryId is null', async () => {
      const existingTaskWithCategory = { ...mockTask, category: mockCategory };
      const updatedTask = { ...mockTask, category: null };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTaskWithCategory);
      mockTaskRepository.save.mockResolvedValue(updatedTask);

      const updateDto: UpdateTaskDto = { categoryId: null };
      const result = await service.updateTask(1, updateDto, mockUser);
      expect(result.category).toBeNull();
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: null }),
      );
    });

    it('should assign new category if categoryId is provided and valid', async () => {
      const existingTask = { ...mockTask, category: null };
      const newCategory = { ...mockCategory, id: 20, name: 'New Cat' };
      const updatedTask = { ...mockTask, category: newCategory };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTask);
      mockCategoriesService.getCategoryById.mockResolvedValue(newCategory);
      mockTaskRepository.save.mockResolvedValue(updatedTask);

      const updateDto: UpdateTaskDto = { categoryId: newCategory.id };
      const result = await service.updateTask(1, updateDto, mockUser);
      expect(result.category).toEqual(newCategory);
      expect(mockCategoriesService.getCategoryById).toHaveBeenCalledWith(
        newCategory.id,
        mockUser,
      );
      expect(mockTaskRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ category: newCategory }),
      );
    });

    it('should throw NotFoundException if new category not found', async () => {
      const existingTask = { ...mockTask };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTask);
      mockCategoriesService.getCategoryById.mockResolvedValue(null);

      const updateDto: UpdateTaskDto = { categoryId: 999 };
      await expect(service.updateTask(1, updateDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockCategoriesService.getCategoryById).toHaveBeenCalledWith(
        999,
        mockUser,
      );
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid status enum', async () => {
      const existingTask = { ...mockTask };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTask);

      const updateDto: UpdateTaskDto = { status: 'INVALID_STATUS' as TaskStatus };
      await expect(service.updateTask(1, updateDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid priority enum', async () => {
      const existingTask = { ...mockTask };
      jest.spyOn(service, 'getTaskById').mockResolvedValue(existingTask);

      const updateDto: UpdateTaskDto = { priority: 'INVALID_PRIORITY' as TaskPriority };
      await expect(service.updateTask(1, updateDto, mockUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockTaskRepository.save).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException if task to update does not exist', async () => {
      jest.spyOn(service, 'getTaskById').mockRejectedValue(new NotFoundException());

      const updateDto: UpdateTaskDto = { title: 'Updated' };
      await expect(service.updateTask(999, updateDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      mockTaskRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteTask(1, mockUser)).resolves.toBeUndefined();
      expect(mockTaskRepository.delete).toHaveBeenCalledWith({
        id: 1,
        user: { id: mockUser.id },
      });
    });

    it('should throw NotFoundException if task not found for user', async () => {
      mockTaskRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteTask(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```