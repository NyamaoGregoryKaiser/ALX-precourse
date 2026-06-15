```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { User } from '../users/entities/user.entity';
import { CustomLogger } from '../common/logger/custom-logger';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoriesRepository: Repository<Category>,
    private readonly logger: CustomLogger,
  ) {}

  /**
   * Creates a new category for the given user.
   * Ensures category name is unique for that user.
   *
   * @param createCategoryDto DTO containing category name and description.
   * @param user The authenticated user.
   * @returns The created category.
   * @throws ConflictException if a category with the same name already exists for the user.
   */
  async createCategory(
    createCategoryDto: CreateCategoryDto,
    user: User,
  ): Promise<Category> {
    const { name, description } = createCategoryDto;

    // Check for existing category with the same name for this user
    const existingCategory = await this.categoriesRepository.findOne({
      where: { name, user: { id: user.id } },
    });

    if (existingCategory) {
      throw new ConflictException(
        `Category with name "${name}" already exists for this user.`,
      );
    }

    const category = this.categoriesRepository.create({
      name,
      description,
      user,
    });

    try {
      await this.categoriesRepository.save(category);
      this.logger.log(
        `User ${user.username} created category: ${category.name}`,
        CategoriesService.name,
      );
      return category;
    } catch (error) {
      this.logger.error(
        `Failed to create category for user ${user.username}. Error: ${error.message}`,
        error.stack,
        CategoriesService.name,
      );
      throw error;
    }
  }

  /**
   * Retrieves all categories for a specific user, optionally filtered by name.
   *
   * @param user The authenticated user.
   * @param name Optional category name to filter by.
   * @returns An array of categories.
   */
  async getCategories(user: User, name?: string): Promise<Category[]> {
    const query = this.categoriesRepository
      .createQueryBuilder('category')
      .where('category.userId = :userId', { userId: user.id });

    if (name) {
      query.andWhere('LOWER(category.name) LIKE LOWER(:name)', {
        name: `%${name}%`,
      });
    }

    const categories = await query.getMany();
    this.logger.debug(
      `User ${user.username} fetched ${categories.length} categories.`,
      CategoriesService.name,
    );
    return categories;
  }

  /**
   * Retrieves a single category by its ID for a specific user.
   *
   * @param id The ID of the category.
   * @param user The authenticated user.
   * @returns The found category.
   * @throws NotFoundException if the category is not found or does not belong to the user.
   */
  async getCategoryById(id: number, user: User): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, user: { id: user.id } },
    });

    if (!category) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }
    this.logger.debug(
      `User ${user.username} fetched category ID: ${id}`,
      CategoriesService.name,
    );
    return category;
  }

  /**
   * Updates an existing category for a specific user.
   * Ensures the updated name (if provided) is unique for that user.
   *
   * @param id The ID of the category to update.
   * @param updateCategoryDto DTO containing updated category data.
   * @param user The authenticated user.
   * @returns The updated category.
   * @throws NotFoundException if the category is not found.
   * @throws ConflictException if the updated name already exists for the user.
   */
  async updateCategory(
    id: number,
    updateCategoryDto: UpdateCategoryDto,
    user: User,
  ): Promise<Category> {
    const category = await this.getCategoryById(id, user); // Ensures category belongs to user

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      // Check for name conflict if name is being updated
      const existingCategory = await this.categoriesRepository.findOne({
        where: { name: updateCategoryDto.name, user: { id: user.id } },
      });
      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Category with name "${updateCategoryDto.name}" already exists for this user.`,
        );
      }
    }

    Object.assign(category, updateCategoryDto);
    await this.categoriesRepository.save(category);
    this.logger.log(
      `User ${user.username} updated category ID: ${id}`,
      CategoriesService.name,
    );
    return category;
  }

  /**
   * Deletes a category by its ID for a specific user.
   *
   * @param id The ID of the category to delete.
   * @param user The authenticated user.
   * @throws NotFoundException if the category is not found or does not belong to the user.
   */
  async deleteCategory(id: number, user: User): Promise<void> {
    const result = await this.categoriesRepository.delete({
      id,
      user: { id: user.id },
    });

    if (result.affected === 0) {
      throw new NotFoundException(`Category with ID "${id}" not found.`);
    }
    this.logger.log(
      `User ${user.username} deleted category ID: ${id}`,
      CategoriesService.name,
    );
  }
}
```