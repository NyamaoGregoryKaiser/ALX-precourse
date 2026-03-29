```typescript
import { AppDataSource } from './config/database';
import { User } from './entities/User';
import { Product } from './entities/Product';
import bcrypt from 'bcryptjs';
import { DataSourceOptions } from 'typeorm';
import { config } from './config';

/**
 * Script to seed initial data into the database.
 * This is useful for development, testing, and initial production setup.
 */
async function seedDatabase() {
  // Temporarily override to use 'src' files for seeding
  const seedDataSourceOptions: DataSourceOptions = {
    ...AppDataSource.options,
    entities: [`${__dirname}/entities/**/*.ts`],
    migrations: [], // No migrations needed for seeding directly
  };
  const seedDataSource = new AppDataSource(seedDataSourceOptions);

  try {
    if (!seedDataSource.isInitialized) {
      await seedDataSource.initialize();
      console.log('Seed database connection initialized.');
    } else {
      console.log('Seed database connection already initialized.');
    }

    // Hash passwords before seeding
    const hashedPassword1 = await bcrypt.hash('password123', 10);
    const hashedPassword2 = await bcrypt.hash('adminpassword', 10);

    // 1. Create Users
    const userRepository = seedDataSource.getRepository(User);

    const user1 = userRepository.create({
      email: 'user1@example.com',
      password: hashedPassword1,
      role: 'user',
    });

    const user2 = userRepository.create({
      email: 'admin@example.com',
      password: hashedPassword2,
      role: 'admin',
    });

    await userRepository.save([user1, user2]);
    console.log('Users seeded successfully!');

    // 2. Create Products
    const productRepository = seedDataSource.getRepository(Product);

    const product1 = productRepository.create({
      name: 'Laptop Pro X',
      description: 'High performance laptop for professionals.',
      price: 1299.99,
      isActive: true,
      user: user1,
    });

    const product2 = productRepository.create({
      name: 'Wireless Ergonomic Mouse',
      description: 'Comfortable and precise mouse for daily use.',
      price: 49.99,
      isActive: true,
      user: user1,
    });

    const product3 = productRepository.create({
      name: '4K Monitor 27"',
      description: 'Stunning visuals for work and entertainment.',
      price: 399.00,
      isActive: true,
      user: user2, // Admin user created this product
    });

    const product4 = productRepository.create({
      name: 'USB-C Hub',
      description: 'Expand your connectivity with multiple ports.',
      price: 79.50,
      isActive: false, // Example of inactive product
      user: user2,
    });

    await productRepository.save([product1, product2, product3, product4]);
    console.log('Products seeded successfully!');

  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  } finally {
    if (seedDataSource.isInitialized) {
      await seedDataSource.destroy();
      console.log('Seed database connection closed.');
    }
  }
}

// Ensure this script is run directly
if (require.main === module) {
  seedDatabase();
}
```