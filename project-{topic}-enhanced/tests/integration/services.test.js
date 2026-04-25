```javascript
const { sequelize, User, Product } = require('../../db/models');
const authService = require('../../services/authService');
const userService = require('../../services/userService');
const productService = require('../../services/productService');
const cache = require('../../utils/cache');
const { AppError } = require('../../utils/errorHandler');
const bcrypt = require('bcryptjs');

describe('Services Integration Tests', () => {
  let adminUser, testUser;
  let testProduct;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // Create initial users for testing
    adminUser = await User.create({
      username: 'serviceadmin',
      email: 'serviceadmin@example.com',
      password: 'adminpassword',
      role: 'admin',
    });
    testUser = await User.create({
      username: 'servicetestuser',
      email: 'servicetestuser@example.com',
      password: 'userpassword',
      role: 'user',
    });

    // Create initial product for testing
    testProduct = await Product.create({
      name: 'Service Test Product',
      description: 'Product for service integration tests',
      price: 100.00,
      stock: 10,
    });
  });

  beforeEach(async () => {
    if (cache.client && cache.client.status === 'ready') {
      await cache.client.flushdb(); // Clear Redis cache before each test
    }
  });

  afterAll(async () => {
    // Clean up or connection closure handled by tests/setup.test.js
  });

  describe('Auth Service', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'registeruser',
        email: 'register@example.com',
        password: 'securepassword',
        role: 'user',
      };
      const { user, accessToken, refreshToken } = await authService.registerUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const cachedToken = await cache.get(`refreshToken:${user.id}:${refreshToken}`);
      expect(cachedToken).toBe('true');
    });

    it('should log in an existing user and return tokens', async () => {
      const { user, accessToken, refreshToken } = await authService.loginUser(
        adminUser.email,
        'adminpassword'
      );

      expect(user).toBeDefined();
      expect(user.email).toBe(adminUser.email);
      expect(accessToken).toBeDefined();
      expect(refreshToken).toBeDefined();

      const cachedToken = await cache.get(`refreshToken:${user.id}:${refreshToken}`);
      expect(cachedToken).toBe('true');
    });

    it('should reject login with incorrect password', async () => {
      await expect(
        authService.loginUser(testUser.email, 'wrongpassword')
      ).rejects.toThrow(new AppError('Incorrect email or password', 401));
    });

    it('should refresh access token and rotate refresh token', async () => {
      const { refreshToken: initialRefreshToken } = await authService.loginUser(
        testUser.email,
        'userpassword'
      );

      const { accessToken: newAccessToken, newRefreshToken } = await authService.refreshAccessToken(initialRefreshToken);

      expect(newAccessToken).toBeDefined();
      expect(newRefreshToken).toBeDefined();
      expect(newAccessToken).not.toBe(initialRefreshToken); // Access token should be new

      // Check if old token is invalidated and new is set
      const oldCachedToken = await cache.get(`refreshToken:${testUser.id}:${initialRefreshToken}`);
      expect(oldCachedToken).toBeNull();
      const newCachedToken = await cache.get(`refreshToken:${testUser.id}:${newRefreshToken}`);
      expect(newCachedToken).toBe('true');
    });

    it('should invalidate refresh token on logout', async () => {
      const { refreshToken } = await authService.loginUser(
        testUser.email,
        'userpassword'
      );

      await authService.logoutUser(refreshToken);

      const cachedToken = await cache.get(`refreshToken:${testUser.id}:${refreshToken}`);
      expect(cachedToken).toBeNull();
    });
  });

  describe('User Service', () => {
    it('should find all users', async () => {
      const users = await userService.findAllUsers();
      expect(users.length).toBeGreaterThanOrEqual(2); // adminUser, testUser, plus any from auth tests
      expect(users.some(u => u.email === adminUser.email)).toBe(true);
      expect(users.some(u => u.email === testUser.email)).toBe(true);

      // Verify caching
      const cachedUsers = await cache.get('all_users');
      expect(cachedUsers).toBeDefined();
      expect(JSON.parse(cachedUsers).length).toBe(users.length);
    });

    it('should create a user', async () => {
      const newUser = await userService.createUser({
        username: 'service_new',
        email: 'service_new@example.com',
        password: 'password',
        role: 'user',
      });
      expect(newUser).toBeDefined();
      expect(newUser.email).toBe('service_new@example.com');
      // Cache should be invalidated
      const cachedUsers = await cache.get('all_users');
      expect(cachedUsers).toBeNull();
    });

    it('should update a user', async () => {
      const updatedUser = await userService.updateUser(testUser.id, { username: 'updated_service_user' });
      expect(updatedUser.username).toBe('updated_service_user');
      // Cache should be invalidated
      const cachedUsers = await cache.get('all_users');
      expect(cachedUsers).toBeNull();
    });

    it('should delete a user', async () => {
      const userToDelete = await User.create({
        username: 'delete_me',
        email: 'delete_me@example.com',
        password: 'password',
      });
      const deleted = await userService.deleteUser(userToDelete.id);
      expect(deleted).toBe(true);
      const found = await User.findByPk(userToDelete.id);
      expect(found).toBeNull();
      // Cache should be invalidated
      const cachedUsers = await cache.get('all_users');
      expect(cachedUsers).toBeNull();
    });
  });

  describe('Product Service', () => {
    it('should find all products', async () => {
      const products = await productService.findAllProducts();
      expect(products.length).toBeGreaterThanOrEqual(1);
      expect(products.some(p => p.name === testProduct.name)).toBe(true);

      // Verify caching
      const cachedProducts = await cache.get('all_products');
      expect(cachedProducts).toBeDefined();
      expect(JSON.parse(cachedProducts).length).toBe(products.length);
    });

    it('should create a product', async () => {
      const newProduct = await productService.createProduct({
        name: 'New Service Product',
        description: 'Description for new service product',
        price: 50.00,
        stock: 20,
      });
      expect(newProduct).toBeDefined();
      expect(newProduct.name).toBe('New Service Product');
      // Cache should be invalidated
      const cachedProducts = await cache.get('all_products');
      expect(cachedProducts).toBeNull();
    });

    it('should update a product', async () => {
      const updatedProduct = await productService.updateProduct(testProduct.id, { price: 120.00 });
      expect(updatedProduct.price).toBe('120.00'); // Sequelize returns DECIMAL as string
      // Cache should be invalidated
      const cachedProducts = await cache.get('all_products');
      expect(cachedProducts).toBeNull();
    });

    it('should delete a product', async () => {
      const productToDelete = await Product.create({
        name: 'Delete Product',
        description: 'Product to be deleted',
        price: 5.00,
        stock: 5,
      });
      const deleted = await productService.deleteProduct(productToDelete.id);
      expect(deleted).toBe(true);
      const found = await Product.findByPk(productToDelete.id);
      expect(found).toBeNull();
      // Cache should be invalidated
      const cachedProducts = await cache.get('all_products');
      expect(cachedProducts).toBeNull();
    });
  });
});
```