```typescript
import { Request, Response, NextFunction } from 'express';
import * as productService from '../services/productService';
import { AppError } from '../utils/errorHandler';
import { createProductSchema, updateProductSchema } from '../validators/productValidator';
import { cacheMiddleware } from '../middleware/cacheMiddleware';
import logger from '../utils/logger';

// Products
export const createProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    const product = await productService.createProduct(value);
    res.status(201).json({
      status: 'success',
      data: { product },
    });
  } catch (err: any) {
    next(err);
  }
};

export const getAllProducts = [
  cacheMiddleware(60), // Cache for 60 seconds
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const minPrice = req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined;
      const maxPrice = req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined;
      const sortBy = (req.query.sortBy as string) || 'createdAt';
      const sortOrder = (req.query.sortOrder as 'asc' | 'desc') || 'desc';

      const { products, total, page: currentPage, limit: currentLimit } = await productService.getAllProducts(
        page, limit, search, categoryId, minPrice, maxPrice, sortBy, sortOrder
      );

      res.status(200).json({
        status: 'success',
        results: products.length,
        pagination: {
          total,
          page: currentPage,
          limit: currentLimit,
          totalPages: Math.ceil(total / currentLimit),
        },
        data: { products },
      });
    } catch (err: any) {
      next(err);
    }
  }
];

export const getProductById = [
  cacheMiddleware(300), // Cache for 5 minutes
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productService.getProductById(req.params.id);
      res.status(200).json({
        status: 'success',
        data: { product },
      });
    } catch (err: any) {
      next(err);
    }
  }
];

export const updateProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }
    const product = await productService.updateProduct(req.params.id, value);
    res.status(200).json({
      status: 'success',
      data: { product },
    });
  } catch (err: any) {
    next(err);
  }
};

export const deleteProduct = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (err: any) {
    next(err);
  }
};

// Categories
export const createCategory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
      return next(new AppError('Category name is required and must be a string.', 400));
    }
    const category = await productService.createCategory({ name });
    res.status(201).json({
      status: 'success',
      data: { category },
    });
  } catch (err: any) {
    next(err);
  }
};

export const getAllCategories = [
  cacheMiddleware(3600), // Cache for 1 hour
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const categories = await productService.getAllCategories();
      res.status(200).json({
        status: 'success',
        results: categories.length,
        data: { categories },
      });
    } catch (err: any) {
      next(err);
    }
  }
];
```