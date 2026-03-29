```typescript
import { Repository } from 'typeorm';
import { Product } from '../entities/Product';
import { AppDataSource } from '../config/database';

/**
 * Custom repository for Product entity.
 * Extends TypeORM's default repository to include specific methods for products.
 */
export const ProductRepository = AppDataSource.getRepository(Product).extend({
  async findProductsByUser(userId: string): Promise<Product[]> {
    return this.find({
      where: { userId },
      relations: ['user'], // Load the related user
    });
  },

  async findProductByName(name: string): Promise<Product | null> {
    return this.findOneBy({ name });
  },

  // Example of a more complex query using QueryBuilder for potential optimization
  async findActiveProductsWithPagination(limit: number, offset: number): Promise<Product[]> {
    return this.createQueryBuilder('product')
      .where('product.isActive = :isActive', { isActive: true })
      .leftJoinAndSelect('product.user', 'user') // Eager load user
      .take(limit)
      .skip(offset)
      .orderBy('product.createdAt', 'DESC')
      .getMany();
  },
});
```