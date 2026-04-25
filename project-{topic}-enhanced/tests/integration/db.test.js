```javascript
const { sequelize, User, Product } = require('../../db/models');
const bcrypt = require('bcryptjs');

describe('Database Integration Tests', () => {
  // Before all tests, ensure a clean state
  beforeAll(async () => {
    // Re-run migrations and seeds for a clean test environment state
    // This assumes sequelize-cli is configured to use DB_TEST_NAME for 'test' env
    await sequelize.sync({ force: true }); // Drops and recreates all tables
    // Insert uuid_generate_v4() extension if not exists
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    await User.bulkCreate([
      { username: 'testadmin', email: 'testadmin@example.com', password: hashedPassword, role: 'admin' },
      { username: 'testuser', email: 'testuser@example.com', password: hashedPassword, role: 'user' },
    ], { individualHooks: true }); // Run hooks (like password hashing) for bulk create

    await Product.bulkCreate([
      { name: 'Test Product 1', description: 'Description for test product 1', price: 10.00, stock: 50 },
      { name: 'Test Product 2', description: 'Description for test product 2', price: 25.50, stock: 100 },
    ]);
  });

  // After all tests, clean up or simply close the connection
  afterAll(async () => {
    // No need to drop if `force: true` is used in beforeAll, but good to close connection
    // await sequelize.drop(); // Optional: drop tables if you want to completely clean up the test schema
    // sequelize.close() is handled by tests/setup.test.js
  });

  // Test User model operations
  describe('User Model', () => {
    it('should create a user successfully with hashed password', async () => {
      const user = await User.create({
        username: 'newuserdb',
        email: 'newuserdb@example.com',
        password: 'securepassword',
        role: 'user',
      });
      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe('newuserdb@example.com');
      expect(user.password).not.toBe('securepassword'); // Should be hashed
      expect(await bcrypt.compare('securepassword', user.password)).toBe(true);
    });

    it('should find a user by email', async () => {
      const user = await User.findOne({ where: { email: 'testadmin@example.com' } });
      expect(user).toBeDefined();
      expect(user.username).toBe('testadmin');
    });

    it('should prevent duplicate emails', async () => {
      await expect(
        User.create({
          username: 'duplicateuser',
          email: 'testadmin@example.com', // Duplicate email
          password: 'password123',
          role: 'user',
        })
      ).rejects.toThrow(sequelize.UniqueConstraintError);
    });

    it('should update a user', async () => {
      const user = await User.findOne({ where: { email: 'testuser@example.com' } });
      expect(user).toBeDefined();
      const updatedUser = await user.update({ username: 'updatedtestuser' });
      expect(updatedUser.username).toBe('updatedtestuser');
    });

    it('should delete a user', async () => {
      const user = await User.create({
        username: 'todelete',
        email: 'todelete@example.com',
        password: 'password123',
      });
      const deletedCount = await User.destroy({ where: { id: user.id } });
      expect(deletedCount).toBe(1);
      const foundUser = await User.findByPk(user.id);
      expect(foundUser).toBeNull();
    });
  });

  // Test Product model operations
  describe('Product Model', () => {
    it('should create a product successfully', async () => {
      const product = await Product.create({
        name: 'New Gadget',
        description: 'A fantastic new electronic gadget.',
        price: 49.99,
        stock: 200,
      });
      expect(product).toBeDefined();
      expect(product.id).toBeDefined();
      expect(product.name).toBe('New Gadget');
      expect(product.price).toBe('49.99'); // Sequelize returns DECIMAL as string
    });

    it('should find a product by name', async () => {
      const product = await Product.findOne({ where: { name: 'Test Product 1' } });
      expect(product).toBeDefined();
      expect(product.price).toBe('10.00');
    });

    it('should prevent duplicate product names', async () => {
      await expect(
        Product.create({
          name: 'Test Product 1', // Duplicate name
          description: 'Another test product with same name.',
          price: 15.00,
          stock: 10,
        })
      ).rejects.toThrow(sequelize.UniqueConstraintError);
    });

    it('should update a product', async () => {
      const product = await Product.findOne({ where: { name: 'Test Product 2' } });
      expect(product).toBeDefined();
      const updatedProduct = await product.update({ stock: 120 });
      expect(updatedProduct.stock).toBe(120);
    });

    it('should delete a product', async () => {
      const product = await Product.create({
        name: 'Delete Item',
        description: 'Item to be deleted.',
        price: 5.00,
        stock: 5,
      });
      const deletedCount = await Product.destroy({ where: { id: product.id } });
      expect(deletedCount).toBe(1);
      const foundProduct = await Product.findByPk(product.id);
      expect(foundProduct).toBeNull();
    });
  });
});
```