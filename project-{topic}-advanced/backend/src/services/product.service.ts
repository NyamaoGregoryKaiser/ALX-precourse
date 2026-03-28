import { PrismaClient, Product } from '@prisma/client';
import { CustomError } from '../utils/errors.util';
import { logger } from '../utils/logger.util';
import { CreateProductDTO, UpdateProductDTO } from '../types/product.d';
import { cache } from '../utils/cache.util'; // Import the cache utility

const prisma = new PrismaClient();

export class ProductService {
  private readonly CACHE_KEY_ALL_PRODUCTS = 'all_products';
  private readonly CACHE_TTL_SECONDS = 300; // 5 minutes

  async getAllProducts(filters: { categoryId?: string; search?: string; page: number; limit: number }): Promise<{ products: Product[]; total: number }> {
    const { categoryId, search, page, limit } = filters;
    const skip = (page - 1) * limit;

    let whereClause: any = {};
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Attempt to fetch from cache for a simple case (no search/filter for now, or sophisticated keying)
    // For production, cache keys would need to be dynamic based on filters.
    // This is a basic demonstration.
    let products: Product[] | null = null;
    let total: number | null = null;

    if (!categoryId && !search && page === 1 && limit <= 50) { // Only cache common queries
      const cachedResult = await cache.get<{ products: Product[], total: number }>(`${this.CACHE_KEY_ALL_PRODUCTS}_page_${page}_limit_${limit}`);
      if (cachedResult) {
        logger.info('Returning products from cache');
        return cachedResult;
      }
    }

    products = await prisma.product.findMany({
      where: whereClause,
      skip,
      take: limit,
      include: {
        category: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    total = await prisma.product.count({ where: whereClause });

    if (!categoryId && !search && page === 1 && limit <= 50) {
      await cache.set(`${this.CACHE_KEY_ALL_PRODUCTS}_page_${page}_limit_${limit}`, { products, total }, this.CACHE_TTL_SECONDS);
    }

    return { products, total };
  }

  async getProductById(id: string): Promise<Product | null> {
    const cachedProduct = await cache.get<Product>(`product_${id}`);
    if (cachedProduct) {
      logger.info(`Returning product ${id} from cache`);
      return cachedProduct;
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true }
        }
      },
    });

    if (product) {
      await cache.set(`product_${id}`, product, this.CACHE_TTL_SECONDS);
    }
    return product;
  }

  async createProduct(productData: CreateProductDTO): Promise<Product> {
    // Check if category exists
    const category = await prisma.category.findUnique({
      where: { id: productData.categoryId },
    });
    if (!category) {
      logger.warn('Product creation failed: Category not found', { categoryId: productData.categoryId });
      throw new CustomError(`Category with ID ${productData.categoryId} not found`, 400);
    }

    const newProduct = await prisma.product.create({
      data: productData,
      include: { category: true },
    });

    await cache.del(this.CACHE_KEY_ALL_PRODUCTS); // Invalidate all products cache
    return newProduct;
  }

  async updateProduct(id: string, productData: UpdateProductDTO): Promise<Product | null> {
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      logger.warn('Product update failed: Product not found', { productId: id });
      throw new CustomError('Product not found', 404);
    }

    if (productData.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: productData.categoryId },
      });
      if (!category) {
        logger.warn('Product update failed: Category not found', { categoryId: productData.categoryId });
        throw new CustomError(`Category with ID ${productData.categoryId} not found`, 400);
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: productData,
      include: { category: true },
    });

    await cache.del(`product_${id}`); // Invalidate single product cache
    await cache.del(this.CACHE_KEY_ALL_PRODUCTS); // Invalidate all products cache
    return updatedProduct;
  }

  async deleteProduct(id: string): Promise<void> {
    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      logger.warn('Product deletion failed: Product not found', { productId: id });
      throw new CustomError('Product not found', 404);
    }

    await prisma.product.delete({
      where: { id },
    });

    await cache.del(`product_${id}`); // Invalidate single product cache
    await cache.del(this.CACHE_KEY_ALL_PRODUCTS); // Invalidate all products cache
  }
}