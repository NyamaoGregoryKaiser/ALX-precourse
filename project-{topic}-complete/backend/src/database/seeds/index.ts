```typescript
import { AppDataSource } from '../data-source';
import { User, UserRole } from '../../modules/users/user.entity';
import { Category } from '../../modules/categories/category.entity';
import { Product } from '../../modules/products/product.entity';
import { Cart } from '../../modules/carts/cart.entity';
import { config } from '../../config';
import logger from '../../utils/logger';
import { In } from 'typeorm';

const seedDatabase = async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      logger.info('Database initialized for seeding.');
    }

    const userRepository = AppDataSource.getRepository(User);
    const categoryRepository = AppDataSource.getRepository(Category);
    const productRepository = AppDataSource.getRepository(Product);
    const cartRepository = AppDataSource.getRepository(Cart);

    // --- 1. Create Admin User ---
    let adminUser = await userRepository.findOne({ where: { email: config.ADMIN.EMAIL } });
    if (!adminUser) {
      const newAdmin = userRepository.create({
        firstName: 'Super',
        lastName: 'Admin',
        email: config.ADMIN.EMAIL,
        password: config.ADMIN.PASSWORD, // Will be hashed by BeforeInsert hook
        role: UserRole.ADMIN,
        isActive: true,
      });
      (newAdmin as any).setNew(true); // Manually set for BeforeInsert hook
      adminUser = await userRepository.save(newAdmin);
      logger.info(`Admin user created: ${adminUser.email}`);
    } else {
      logger.info(`Admin user already exists: ${adminUser.email}`);
    }

    // --- 2. Create Sample Customer User ---
    let customerUser = await userRepository.findOne({ where: { email: 'customer@example.com' } });
    if (!customerUser) {
      const newCustomer = userRepository.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'customer@example.com',
        password: 'Password123!',
        role: UserRole.CUSTOMER,
        isActive: true,
      });
      (newCustomer as any).setNew(true);
      customerUser = await userRepository.save(newCustomer);
      logger.info(`Customer user created: ${customerUser.email}`);
    } else {
      logger.info(`Customer user already exists: ${customerUser.email}`);
    }

    // --- 3. Create Sample Seller User ---
    let sellerUser = await userRepository.findOne({ where: { email: 'seller@example.com' } });
    if (!sellerUser) {
      const newSeller = userRepository.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'seller@example.com',
        password: 'Password123!',
        role: UserRole.SELLER,
        isActive: true,
      });
      (newSeller as any).setNew(true);
      sellerUser = await userRepository.save(newSeller);
      logger.info(`Seller user created: ${sellerUser.email}`);
    } else {
      logger.info(`Seller user already exists: ${sellerUser.email}`);
    }

    // --- 4. Create default categories ---
    const defaultCategories = [
      { name: 'Electronics', slug: 'electronics', description: 'Gadgets and electronic devices.' },
      { name: 'Books', slug: 'books', description: 'Fiction and non-fiction books.' },
      { name: 'Clothing', slug: 'clothing', description: 'Apparel for men, women, and children.' },
      { name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Essentials for your home.' },
    ];

    const existingCategories = await categoryRepository.find({
      where: { slug: In(defaultCategories.map(c => c.slug)) }
    });

    const categoriesToCreate = defaultCategories.filter(
      dc => !existingCategories.some(ec => ec.slug === dc.slug)
    );

    if (categoriesToCreate.length > 0) {
      const newCategories = await categoryRepository.save(categoriesToCreate.map(c => categoryRepository.create(c)));
      logger.info(`Created ${newCategories.length} new categories.`);
    } else {
      logger.info('Default categories already exist.');
    }

    const allCategories = await categoryRepository.find();
    const electronicsCategory = allCategories.find(c => c.slug === 'electronics');
    const booksCategory = allCategories.find(c => c.slug === 'books');

    // --- 5. Create sample products ---
    const sampleProducts = [
      {
        name: 'Smartphone X',
        description: 'Latest model smartphone with advanced features.',
        price: 999.99,
        stock: 50,
        images: ['https://example.com/phone-x-1.jpg', 'https://example.com/phone-x-2.jpg'],
        category: electronicsCategory!,
        seller: sellerUser!,
      },
      {
        name: 'The Alchemist',
        description: 'A philosophical novel by Paulo Coelho.',
        price: 15.00,
        stock: 100,
        images: ['https://example.com/alchemist.jpg'],
        category: booksCategory!,
        seller: sellerUser!,
      },
      {
        name: 'Wireless Headphones',
        description: 'Noise-cancelling over-ear headphones.',
        price: 149.99,
        stock: 75,
        images: ['https://example.com/headphones.jpg'],
        category: electronicsCategory!,
        seller: sellerUser!,
      },
    ];

    for (const productData of sampleProducts) {
      const existingProduct = await productRepository.findOne({ where: { name: productData.name } });
      if (!existingProduct) {
        const newProduct = productRepository.create(productData);
        await productRepository.save(newProduct);
        logger.info(`Created product: ${newProduct.name}`);
      } else {
        logger.info(`Product already exists: ${productData.name}`);
      }
    }

    // --- 6. Create carts for users if they don't exist ---
    const usersForCarts = [adminUser, customerUser, sellerUser].filter(Boolean) as User[];
    for (const user of usersForCarts) {
      const existingCart = await cartRepository.findOne({ where: { user: { id: user.id } } });
      if (!existingCart) {
        const newCart = cartRepository.create({ user });
        await cartRepository.save(newCart);
        logger.info(`Created cart for user: ${user.email}`);
      } else {
        logger.info(`Cart already exists for user: ${user.email}`);
      }
    }


    logger.info('Database seeding completed!');
  } catch (error) {
    logger.error('Error seeding database:', error);
    process.exit(1);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('Database connection closed after seeding.');
    }
  }
};

seedDatabase();
```