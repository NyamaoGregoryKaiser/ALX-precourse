```typescript
import { Product, Prisma } from '@prisma/client';
import { AppError } from '../utils/errorHandler';
import logger from '../utils/logger';
import { prisma } from '../database/prisma/client';
import { clearCacheByPrefix } from '../middleware/cacheMiddleware';

// Type for product creation data
export interface ProductCreateData {
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  categoryId: string;
}

// Type for product update data
export interface ProductUpdateData {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  imageUrl?: string;
  categoryId?: string;
}

const PRODUCT_CACHE_PREFIX = '/api/products'; // Cache key prefix for products

export const createProduct = async (productData: ProductCreateData): Promise<Product> => {
  try {
    const categoryExists = await prisma.category.findUnique({ where: { id: productData.categoryId } });
    if (!categoryExists) {
      throw new AppError(`Category with ID ${productData.categoryId} not found`, 404);
    }

    const newProduct = await prisma.product.create({
      data: productData,
    });
    await clearCacheByPrefix(PRODUCT_CACHE_PREFIX); // Clear product list cache
    logger.info(`Product created: ${newProduct.name}`);
    return newProduct;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error creating product:', error);
    throw new AppError('Failed to create product', 500);
  }
};

export const getAllProducts = async (
  page: number = 1,
  limit: number = 10,
  search?: string,
  categoryId?: string,
  minPrice?: number,
  maxPrice?: number,
  sortBy: string = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
): Promise<{ products: Product[]; total: number; page: number; limit: number }> => {
  const skip = (page - 1) * limit;
  const where: Prisma.ProductWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (categoryId) {
    where.categoryId = categoryId;
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) (where.price as Prisma.FloatFilter).gte = minPrice;
    if (maxPrice !== undefined) (where.price as Prisma.FloatFilter).lte = maxPrice;
  }

  const products = await prisma.product.findMany({
    where,
    skip,
    take: limit,
    orderBy: {
      [sortBy]: sortOrder,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  const total = await prisma.product.count({ where });

  return { products, total, page, limit };
};

export const getProductById = async (productId: string): Promise<Product | null> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  if (!product) {
    throw new AppError(`Product with ID ${productId} not found`, 404);
  }
  return product;
};

export const updateProduct = async (productId: string, productData: ProductUpdateData): Promise<Product> => {
  try {
    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      throw new AppError(`Product with ID ${productId} not found`, 404);
    }

    if (productData.categoryId) {
      const categoryExists = await prisma.category.findUnique({ where: { id: productData.categoryId } });
      if (!categoryExists) {
        throw new AppError(`Category with ID ${productData.categoryId} not found`, 404);
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: productData,
    });
    await clearCacheByPrefix(PRODUCT_CACHE_PREFIX); // Clear product list cache
    await clearCache(`${PRODUCT_CACHE_PREFIX}/${productId}`); // Clear specific product cache
    logger.info(`Product updated: ${updatedProduct.name}`);
    return updatedProduct;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error updating product:', error);
    throw new AppError('Failed to update product', 500);
  }
};

export const deleteProduct = async (productId: string): Promise<void> => {
  try {
    const existingProduct = await prisma.product.findUnique({ where: { id: productId } });
    if (!existingProduct) {
      throw new AppError(`Product with ID ${productId} not found`, 404);
    }
    await prisma.product.delete({ where: { id: productId } });
    await clearCacheByPrefix(PRODUCT_CACHE_PREFIX); // Clear product list cache
    await clearCache(`${PRODUCT_CACHE_PREFIX}/${productId}`); // Clear specific product cache
    logger.info(`Product deleted: ID ${productId}`);
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error deleting product:', error);
    throw new AppError('Failed to delete product', 500);
  }
};

// --- Category Service (simplified, could be its own service) ---
export interface CategoryCreateData {
  name: string;
}

export const createCategory = async (categoryData: CategoryCreateData): Promise<Category> => {
  try {
    const existingCategory = await prisma.category.findUnique({ where: { name: categoryData.name } });
    if (existingCategory) {
      throw new AppError(`Category with name '${categoryData.name}' already exists`, 409);
    }
    const newCategory = await prisma.category.create({
      data: categoryData,
    });
    await clearCache('/api/categories'); // Clear category list cache
    logger.info(`Category created: ${newCategory.name}`);
    return newCategory;
  } catch (error) {
    if (error instanceof AppError) throw error;
    logger.error('Error creating category:', error);
    throw new AppError('Failed to create category', 500);
  }
};

export const getAllCategories = async (): Promise<Category[]> => {
  return prisma.category.findMany();
};
```