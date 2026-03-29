```typescript
import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { ProductRepository } from '../repositories/ProductRepository';
import logger from '../utils/logger';
import { getCache, setCache, deleteCache } from '../utils/cache';

/**
 * Service layer for Product-related business logic (CRUD operations).
 * Handles fetching, creating, updating, and deleting products,
 * including integration with caching.
 */
export class ProductService {
  /**
   * Fetches all products. Tries to retrieve from cache first.
   * @returns A promise that resolves to an array of Product entities.
   */
  async getAllProducts(): Promise<Product[]> {
    const cacheKey = 'allProducts';
    const cachedProducts = getCache<Product[]>(cacheKey);

    if (cachedProducts) {
      logger.debug('Fetched products from cache.');
      return cachedProducts;
    }

    logger.debug('Fetching all products from DB...');
    const products = await ProductRepository.find({ relations: ['user'] }); // Eager load the user
    setCache(cacheKey, products); // Cache the results
    return products;
  }

  /**
   * Fetches a single product by its ID.
   * @param id The UUID of the product.
   * @returns A promise that resolves to the Product entity or null if not found.
   */
  async getProductById(id: string): Promise<Product | null> {
    logger.debug(`Fetching product by ID: ${id}`);
    return ProductRepository.findOne({ where: { id }, relations: ['user'] });
  }

  /**
   * Creates a new product.
   * @param name Name of the product.
   * @param description Description of the product.
   * @param price Price of the product.
   * @param userId ID of the user creating the product.
   * @returns A promise that resolves to the newly created Product entity, or null if product name exists.
   */
  async createProduct(name: string, description: string | undefined, price: number, user: User): Promise<Product | null> {
    const existingProduct = await ProductRepository.findProductByName(name);
    if (existingProduct) {
      logger.warn(`Product creation failed: Product with name "${name}" already exists.`);
      return null;
    }

    const newProduct = ProductRepository.create({
      name,
      description,
      price,
      user,
      userId: user.id,
    });
    await ProductRepository.save(newProduct);
    logger.info(`Product created: ${newProduct.name} by user ${user.email}`);
    deleteCache('allProducts'); // Invalidate cache
    return newProduct;
  }

  /**
   * Updates an existing product.
   * @param id The UUID of the product to update.
   * @param productData Partial product data to update.
   * @returns A promise that resolves to the updated Product entity or null if not found.
   */
  async updateProduct(id: string, productData: Partial<Product>): Promise<Product | null> {
    const product = await ProductRepository.findOneBy({ id });
    if (!product) {
      logger.warn(`Product update failed: Product with ID ${id} not found.`);
      return null;
    }

    // If name is being updated, check for uniqueness unless it's the current product's name
    if (productData.name && productData.name !== product.name) {
      const existingProduct = await ProductRepository.findProductByName(productData.name);
      if (existingProduct && existingProduct.id !== id) {
        logger.warn(`Product update failed: Product with name "${productData.name}" already exists.`);
        return null; // Another product already has this name
      }
    }

    Object.assign(product, productData);
    await ProductRepository.save(product);
    logger.info(`Product updated: ${product.name} (ID: ${product.id})`);
    deleteCache('allProducts'); // Invalidate cache
    return product;
  }

  /**
   * Deletes a product by its ID.
   * @param id The UUID of the product to delete.
   * @returns A boolean indicating whether the deletion was successful.
   */
  async deleteProduct(id: string): Promise<boolean> {
    const deleteResult = await ProductRepository.delete(id);
    if (deleteResult.affected && deleteResult.affected > 0) {
      logger.info(`Product deleted successfully: ID ${id}`);
      deleteCache('allProducts'); // Invalidate cache
      return true;
    }
    logger.warn(`Product deletion failed: Product with ID ${id} not found.`);
    return false;
  }
}
```