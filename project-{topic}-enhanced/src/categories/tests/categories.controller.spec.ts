```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesController } from '../categories.controller';
import { CategoriesService } from '../categories.service';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { User } from '../../users/entities/user.entity';
import { Category } from '../entities/category.entity';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { CacheInterceptor } from '@nestjs/cache-manager';
import { of } from 'rxjs';
import { CustomLogger } from '../../common/logger/custom-logger';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: CategoriesService;
  let mockUser: User;
  let mockCategory: Category;

  const mockCategoriesService = {
    createCategory: jest.fn(),
    getCategories: jest.fn(),
    getCategoryById: jest.fn(),
    updateCategory: jest.fn(),
    deleteCategory: jest.fn(),
  };

  const mockCacheInterceptor = {
    intercept: jest.fn((context, next) => next.handle().pipe(tap((data) => data))), // Passthrough
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
      id: 1,
      name: 'Work',
      description: 'Work-related tasks',
      user: mockUser,
      tasks: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CategoriesController],
      providers: [
        {
          provide: CategoriesService,
          useValue: mockCategoriesService,
        },
        {
          provide: CacheInterceptor,
          useValue: mockCacheInterceptor,
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

    controller = module.get<CategoriesController>(CategoriesController);
    service = module.get<CategoriesService>(CategoriesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const createDto: CreateCategoryDto = {
        name: 'New Category',
        description: 'Description',
      };
      mockCategoriesService.createCategory.mockResolvedValue(mockCategory);

      expect(await controller.create(createDto, mockUser)).toEqual(mockCategory);
      expect(mockCategoriesService.createCategory).toHaveBeenCalledWith(createDto, mockUser);
    });

    it('should throw ConflictException if category name already exists', async () => {
      const createDto: CreateCategoryDto = {
        name: 'Work',
        description: 'Description',
      };
      mockCategoriesService.createCategory.mockRejectedValue(
        new ConflictException('Category with name "Work" already exists for this user.'),
      );

      await expect(controller.create(createDto, mockUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findAll', () => {
    it('should return an array of categories', async () => {
      mockCategoriesService.getCategories.mockResolvedValue([mockCategory]);

      expect(await controller.findAll(mockUser)).toEqual([mockCategory]);
      expect(mockCategoriesService.getCategories).toHaveBeenCalledWith(mockUser, undefined);
    });

    it('should filter categories by name', async () => {
      mockCategoriesService.getCategories.mockResolvedValue([mockCategory]);

      expect(await controller.findAll(mockUser, 'Work')).toEqual([mockCategory]);
      expect(mockCategoriesService.getCategories).toHaveBeenCalledWith(mockUser, 'Work');
    });

    it('should use CacheInterceptor for findAll', async () => {
        // Since we're providing a mock interceptor, we can check if its intercept method is called.
        // The actual caching logic is handled by NestJS's CacheModule, which is difficult to fully
        // test in a unit test without an actual Redis instance or complex mocks.
        // This check ensures the interceptor is "attached" to the method.
        // For a true integration test, you'd test against a live Redis.

        // Temporarily override the intercept method to spy on its behavior
        const spy = jest.spyOn(mockCacheInterceptor, 'intercept');
        mockCategoriesService.getCategories.mockResolvedValue([]); // Ensure a value is returned

        await controller.findAll(mockUser);

        // Expect the intercept method to have been called. The exact context
        // is complex to mock for CacheInterceptor, but this confirms it's used.
        expect(spy).toHaveBeenCalled();
        spy.mockRestore(); // Restore original mock after test
    });
  });

  describe('findOne', () => {
    it('should return a single category', async () => {
      mockCategoriesService.getCategoryById.mockResolvedValue(mockCategory);

      expect(await controller.findOne(1, mockUser)).toEqual(mockCategory);
      expect(mockCategoriesService.getCategoryById).toHaveBeenCalledWith(1, mockUser);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoriesService.getCategoryById.mockRejectedValue(
        new NotFoundException('Category with ID "999" not found.'),
      );

      await expect(controller.findOne(999, mockUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updateDto: UpdateCategoryDto = { name: 'Updated Work' };
      const updatedCategory = { ...mockCategory, name: 'Updated Work' };
      mockCategoriesService.updateCategory.mockResolvedValue(updatedCategory);

      expect(await controller.update(1, updateDto, mockUser)).toEqual(updatedCategory);
      expect(mockCategoriesService.updateCategory).toHaveBeenCalledWith(
        1,
        updateDto,
        mockUser,
      );
    });

    it('should throw NotFoundException if category not found', async () => {
      const updateDto: UpdateCategoryDto = { name: 'Updated Work' };
      mockCategoriesService.updateCategory.mockRejectedValue(
        new NotFoundException('Category with ID "999" not found.'),
      );

      await expect(controller.update(999, updateDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      mockCategoriesService.deleteCategory.mockResolvedValue(undefined); // delete returns void

      await expect(controller.remove(1, mockUser)).resolves.toBeUndefined();
      expect(mockCategoriesService.deleteCategory).toHaveBeenCalledWith(1, mockUser);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockCategoriesService.deleteCategory.mockRejectedValue(
        new NotFoundException('Category with ID "999" not found.'),
      );

      await expect(controller.remove(999, mockUser)).rejects.toThrow(NotFoundException);
    });
  });
});
```