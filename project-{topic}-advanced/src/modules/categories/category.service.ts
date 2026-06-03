```typescript
import * as categoryRepository from './category.repository';
import { AppError, HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';
import { cacheDel, cacheGet, cacheSet, cacheDelByPattern } from '../../utils/redis-client';
import { CACHE_KEYS } from '../../config/constants';

export const createCategory = async (name: string, userId: string) => {
  try {
    const existingCategory = await categoryRepository.findCategoryByNameAndUser(name, userId);
    if (existingCategory) {
      throw new AppError('Category with this name already exists for this user', HttpCode.CONFLICT);
    }
    const category = await categoryRepository.createCategory(name, userId);
    await cacheDel(CACHE_KEYS.CATEGORIES_ALL); // Invalidate all categories cache
    return category;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in createCategory service for user ${userId}:`, error);
    throw new AppError('Could not create category', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const getAllCategories = async (userId: string) => {
  try {
    const cacheKey = `${CACHE_KEYS.CATEGORIES_ALL}:${userId}`;
    const cachedCategories = await cacheGet(cacheKey);
    if (cachedCategories) {
      return cachedCategories;
    }

    const categories = await categoryRepository.findAllCategories(userId);
    await cacheSet(cacheKey, categories, 300); // Cache for 5 minutes
    return categories;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in getAllCategories service for user ${userId}:`, error);
    throw new AppError('Could not retrieve categories', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const getCategoryById = async (categoryId: string, userId: string) => {
  try {
    // Note: Caching for single category might be less beneficial than for all if
    // categories are rarely fetched individually. For simplicity, we skip individual cache.
    const category = await categoryRepository.findCategoryByIdAndUser(categoryId, userId);
    if (!category) {
      throw new AppError('Category not found or not owned by user', HttpCode.NOT_FOUND);
    }
    return category;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in getCategoryById service for category ${categoryId} by user ${userId}:`, error);
    throw new AppError('Could not retrieve category', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const updateCategory = async (categoryId: string, userId: string, name: string) => {
  try {
    const existingCategory = await categoryRepository.findCategoryByIdAndUser(categoryId, userId);
    if (!existingCategory) {
      throw new AppError('Category not found or not owned by user', HttpCode.NOT_FOUND);
    }

    const nameConflict = await categoryRepository.findCategoryByNameAndUser(name, userId);
    if (nameConflict && nameConflict.id !== categoryId) {
      throw new AppError('Another category with this name already exists for this user', HttpCode.CONFLICT);
    }

    const updatedCategory = await categoryRepository.updateCategory(categoryId, name);
    await cacheDel(`${CACHE_KEYS.CATEGORIES_ALL}:${userId}`); // Invalidate all categories cache for this user
    return updatedCategory;
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in updateCategory service for category ${categoryId} by user ${userId}:`, error);
    throw new AppError('Could not update category', HttpCode.INTERNAL_SERVER_ERROR);
  }
};

export const deleteCategory = async (categoryId: string, userId: string) => {
  try {
    const existingCategory = await categoryRepository.findCategoryByIdAndUser(categoryId, userId);
    if (!existingCategory) {
      throw new AppError('Category not found or not owned by user', HttpCode.NOT_FOUND);
    }
    // Prisma's cascade delete on tasks will handle associated tasks.
    await categoryRepository.deleteCategory(categoryId);
    await cacheDel(`${CACHE_KEYS.CATEGORIES_ALL}:${userId}`); // Invalidate all categories cache for this user
    await cacheDelByPattern(CACHE_KEYS.TASK_BY_ID('*')); // Invalidate tasks cache as tasks might lose category_id
  } catch (error: any) {
    if (error instanceof AppError) throw error;
    logger.error(`Error in deleteCategory service for category ${categoryId} by user ${userId}:`, error);
    throw new AppError('Could not delete category', HttpCode.INTERNAL_SERVER_ERROR);
  }
};
```