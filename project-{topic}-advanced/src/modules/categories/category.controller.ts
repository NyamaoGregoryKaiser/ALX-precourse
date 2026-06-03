```typescript
import { Request, Response, NextFunction } from 'express';
import * as categoryService from './category.service';
import { HttpCode } from '../../utils/app-error';
import { logger } from '../../utils/logger';

export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    const category = await categoryService.createCategory(name, req.user!.id); // Associate with logged-in user

    res.status(HttpCode.CREATED).json({
      status: 'success',
      message: 'Category created successfully',
      data: { category },
    });
  } catch (error: any) {
    logger.error(`Error creating category: ${error.message}`);
    next(error);
  }
};

export const getAllCategories = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Only fetch categories for the logged-in user
    const categories = await categoryService.getAllCategories(req.user!.id);

    res.status(HttpCode.OK).json({
      status: 'success',
      results: categories.length,
      data: { categories },
    });
  } catch (error: any) {
    logger.error(`Error fetching categories: ${error.message}`);
    next(error);
  }
};

export const getCategoryById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    const category = await categoryService.getCategoryById(categoryId, req.user!.id);

    res.status(HttpCode.OK).json({
      status: 'success',
      data: { category },
    });
  } catch (error: any) {
    logger.error(`Error fetching category ${req.params.id}: ${error.message}`);
    next(error);
  }
};

export const updateCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    const { name } = req.body;
    const updatedCategory = await categoryService.updateCategory(categoryId, req.user!.id, name);

    res.status(HttpCode.OK).json({
      status: 'success',
      message: 'Category updated successfully',
      data: { category: updatedCategory },
    });
  } catch (error: any) {
    logger.error(`Error updating category ${req.params.id}: ${error.message}`);
    next(error);
  }
};

export const deleteCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categoryId = req.params.id;
    await categoryService.deleteCategory(categoryId, req.user!.id);

    res.status(HttpCode.NO_CONTENT).json({
      status: 'success',
      message: 'Category deleted successfully',
      data: null,
    });
  } catch (error: any) {
    logger.error(`Error deleting category ${req.params.id}: ${error.message}`);
    next(error);
  }
};
```