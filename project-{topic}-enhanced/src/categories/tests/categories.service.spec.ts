```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from '../categories.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../entities/category.entity';
import { User } from '../../users/entities/user.entity';
import { CreateCategoryDto } from '../dto/create-category.dto';
import { UpdateCategoryDto } from '../dto/update-category.dto';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CustomLogger } from '../../common/logger/custom-logger';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let repository: Repository<Category>;
  let mockUser: User;
  let mockCategory: Category;

  const mockCategoriesRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
    delete: jest.fn(),
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
      providers: [
        CategoriesService,
        {
          provide: getRepositoryToken(Category),
          useValue: mockCategoriesRepository,
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

    service = module.get<CategoriesService>(CategoriesService);
    repository = module.get<Repository<Category>>(getRepositoryToken(Category));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCategory', () => {
    const createDto: CreateCategoryDto = {
      name: 'New Category',
      description: 'Description for new category',
    };

    it('should successfully create a category', async () => {
      mockCategoriesRepository.findOne.mockResolvedValue(null);
      mockCategoriesRepository.create.mockReturnValue(mockCategory);
      mockCategoriesRepository.save.mockResolvedValue(mockCategory);

      const result = await service.createCategory(createDto, mockUser);
      expect(result).toEqual(mockCategory);
      expect(mockCategoriesRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name, user: { id: mockUser.id } },
      });
      expect(mockCategoriesRepository.create).toHaveBeenCalledWith({
        ...createDto,
        user: mockUser,
      });
      expect(mockCategoriesRepository.save).toHaveBeenCalledWith(mockCategory);
    });

    it('should throw ConflictException if category name already exists for user', async () => {
      mockCategoriesRepository.findOne.mockResolvedValue(mockCategory); // Category already exists

      await expect(service.createCategory(createDto, mockUser)).rejects.toThrow(
        ConflictException,
      );
      expect(mockCategoriesRepository.findOne).toHaveBeenCalledWith({
        where: { name: createDto.name, user: { id: mockUser.id } },
      });
      expect(mockCategoriesRepository.save).not.toHaveBeenCalled();
    });

    it('should throw generic error if save fails', async () => {
      mockCategoriesRepository.findOne.mockResolvedValue(null);
      mockCategoriesRepository.create.mockReturnValue(mockCategory);
      mockCategoriesRepository.save.mockRejectedValue(new Error('DB error'));

      await expect(service.createCategory(createDto, mockUser)).rejects.toThrow(
        'DB error',
      );
    });
  });

  describe('getCategories', () => {
    it('should return all categories for a user', async () => {
      const categories = [mockCategory];
      mockCategoriesRepository.createQueryBuilder().getMany.mockResolvedValue(categories);

      const result = await service.getCategories(mockUser);
      expect(result).toEqual(categories);
      expect(mockCategoriesRepository.createQueryBuilder).toHaveBeenCalled();
      expect(
        mockCategoriesRepository.createQueryBuilder().where,
      ).toHaveBeenCalledWith('category.userId = :userId', { userId: mockUser.id });
      expect(mockCategoriesRepository.createQueryBuilder().getMany).toHaveBeenCalled();
    });

    it('should filter categories by name if provided', async () => {
      const categories = [mockCategory];
      mockCategoriesRepository.createQueryBuilder().getMany.mockResolvedValue(categories);

      const result = await service.getCategories(mockUser, 'Work');
      expect(result).toEqual(categories);
      expect(
        mockCategoriesRepository.createQueryBuilder().andWhere,
      ).toHaveBeenCalledWith('LOWER(category.name) LIKE LOWER(:name)', {
        name: '%Work%',
      });
    });
  });

  describe('getCategoryById', () => {
    it('should return a category by ID for the user', async () => {
      mockCategoriesRepository.findOne.mockResolvedValue(mockCategory);

      const result = await service.getCategoryById(1, mockUser);
      expect(result).toEqual(mockCategory);
      expect(mockCategoriesRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, user: { id: mockUser.id } },
      });
    });

    it('should throw NotFoundException if category not found for user', async () => {
      mockCategoriesRepository.findOne.mockResolvedValue(null);

      await expect(service.getCategoryById(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateCategory', () => {
    const updateDto: UpdateCategoryDto = { name: 'Updated Category' };

    it('should update a category successfully', async () => {
      const existingCategory = { ...mockCategory };
      const updatedCategory = { ...mockCategory, name: 'Updated Category' };
      jest.spyOn(service, 'getCategoryById').mockResolvedValue(existingCategory);
      mockCategoriesRepository.findOne.mockResolvedValue(null); // No conflict
      mockCategoriesRepository.save.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory(1, updateDto, mockUser);
      expect(result).toEqual(updatedCategory);
      expect(service.getCategoryById).toHaveBeenCalledWith(1, mockUser);
      expect(mockCategoriesRepository.findOne).toHaveBeenCalledWith({
        where: { name: updateDto.name, user: { id: mockUser.id } },
      });
      expect(mockCategoriesRepository.save).toHaveBeenCalledWith(updatedCategory);
    });

    it('should throw NotFoundException if category does not exist', async () => {
      jest
        .spyOn(service, 'getCategoryById')
        .mockRejectedValue(new NotFoundException());

      await expect(service.updateCategory(999, updateDto, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if updated name already exists for another category of the user', async () => {
      const existingCategory = { ...mockCategory, id: 1, name: 'Original Name' };
      const conflictCategory = { ...mockCategory, id: 2, name: 'Updated Category' }; // Another category with desired name
      jest.spyOn(service, 'getCategoryById').mockResolvedValue(existingCategory);
      mockCategoriesRepository.findOne.mockResolvedValue(conflictCategory); // Conflict found

      const updateDtoWithConflict: UpdateCategoryDto = { name: 'Updated Category' };
      await expect(
        service.updateCategory(1, updateDtoWithConflict, mockUser),
      ).rejects.toThrow(ConflictException);
      expect(mockCategoriesRepository.findOne).toHaveBeenCalledWith({
        where: { name: updateDtoWithConflict.name, user: { id: mockUser.id } },
      });
      expect(mockCategoriesRepository.save).not.toHaveBeenCalled();
    });

    it('should not throw conflict if updated name is the same as current category name', async () => {
      const existingCategory = { ...mockCategory, id: 1, name: 'Original Name' };
      jest.spyOn(service, 'getCategoryById').mockResolvedValue(existingCategory);
      mockCategoriesRepository.findOne.mockResolvedValue(existingCategory); // Found itself

      const updateDtoSameName: UpdateCategoryDto = { name: 'Original Name' };
      const result = await service.updateCategory(1, updateDtoSameName, mockUser);
      expect(result).toEqual(existingCategory); // No change, but no error
      expect(mockCategoriesRepository.save).toHaveBeenCalledWith(existingCategory);
    });
  });

  describe('deleteCategory', () => {
    it('should delete a category successfully', async () => {
      mockCategoriesRepository.delete.mockResolvedValue({ affected: 1 });

      await expect(service.deleteCategory(1, mockUser)).resolves.toBeUndefined();
      expect(mockCategoriesRepository.delete).toHaveBeenCalledWith({
        id: 1,
        user: { id: mockUser.id },
      });
    });

    it('should throw NotFoundException if category not found for user', async () => {
      mockCategoriesRepository.delete.mockResolvedValue({ affected: 0 });

      await expect(service.deleteCategory(999, mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
```