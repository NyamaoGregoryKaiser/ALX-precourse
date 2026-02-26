import { AppDataSource } from '../data-source';
import { User, UserRole } from '../entities/User.entity';
import { Category } from '../entities/Category.entity';
import { Product } from '../entities/Product.entity';
import { Review } from '../entities/Review.entity';
import logger from '../../utils/logger';

/**
 * Seeds the database with initial data.
 */
export const seedDatabase = async (): Promise<void> => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepository = AppDataSource.getRepository(User);
  const categoryRepository = AppDataSource.getRepository(Category);
  const productRepository = AppDataSource.getRepository(Product);
  const reviewRepository = AppDataSource.getRepository(Review);

  try {
    logger.info('Starting database seeding...');

    // 1. Create Users
    const adminUser = userRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'adminpassword123', // Will be hashed by pre-save hook
      role: UserRole.ADMIN,
    });
    await adminUser.hashPassword(); // Manually hash before saving since TypeORM does not run hooks on .save for inserts
    await userRepository.save(adminUser);

    const regularUser = userRepository.create({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
      password: 'janepassword123',
      role: UserRole.USER,
    });
    await regularUser.hashPassword();
    await userRepository.save(regularUser);

    logger.info('Users seeded.');

    // 2. Create Categories
    const electronics = await categoryRepository.save({
      name: 'Electronics',
      description: 'Modern electronic devices and gadgets.',
    });
    const books = await categoryRepository.save({
      name: 'Books',
      description: 'A wide range of books from various genres.',
    });
    const clothing = await categoryRepository.save({
      name: 'Clothing',
      description: 'Fashionable apparel for all ages.',
    });

    logger.info('Categories seeded.');

    // 3. Create Products
    const product1 = await productRepository.save({
      name: 'Smartphone X',
      description: 'The latest smartphone with incredible features and camera.',
      price: 799.99,
      stock: 150,
      imageUrl: 'https://example.com/images/smartphone-x.jpg',
      category: electronics,
    });

    const product2 = await productRepository.save({
      name: 'E-Reader Pro',
      description: 'A premium e-reader for an immersive reading experience.',
      price: 129.99,
      stock: 200,
      imageUrl: 'https://example.com/images/e-reader-pro.jpg',
      category: electronics,
    });

    const product3 = await productRepository.save({
      name: 'The Great Novel',
      description: 'A timeless classic that every reader must experience.',
      price: 19.95,
      stock: 500,
      imageUrl: 'https://example.com/images/great-novel.jpg',
      category: books,
    });

    const product4 = await productRepository.save({
      name: 'Wireless Headphones',
      description: 'High-quality wireless headphones with noise cancellation.',
      price: 199.99,
      stock: 300,
      imageUrl: 'https://example.com/images/headphones.jpg',
      category: electronics,
    });

    logger.info('Products seeded.');

    // 4. Create Reviews
    await reviewRepository.save({
      user: regularUser,
      product: product1,
      rating: 5,
      comment: 'Absolutely love my new Smartphone X! The camera is amazing.',
    });

    await reviewRepository.save({
      user: adminUser,
      product: product2,
      rating: 4,
      comment: 'Great e-reader, easy on the eyes. Battery life is excellent.',
    });

    await reviewRepository.save({
      user: regularUser,
      product: product3,
      rating: 5,
      comment: 'A masterpiece! Highly recommend this book.',
    });

    logger.info('Reviews seeded.');

    // Note: Orders and OrderItems are usually created through user actions,
    // so not seeding them here initially but the logic for it is present.

    logger.info('Database seeding completed successfully!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
};

// Run the seeder if executed directly
if (require.main === module) {
  seedDatabase();
}