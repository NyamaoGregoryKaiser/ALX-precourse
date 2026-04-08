const request = require('supertest');
const app = require('../../src/app');
const sequelize = require('../../src/config/database');
const User = require('../../src/models/User')(sequelize, require('sequelize'));
const Product = require('../../src/models/Product')(sequelize, require('sequelize'));
const authService = require('../../src/services/authService');
const { clearCache } = require('../../src/middleware/cache'); // Import clearCache

describe('Product API Tests', () => {
  let adminToken, userToken;
  let adminUser, regularUser;

  beforeAll(async () => {
    // Clear database and seed test users
    await User.destroy({ truncate: true, cascade: true });
    await Product.destroy({ truncate: true, cascade: true });
    await clearCache('products:*'); // Clear all product cache before tests

    adminUser = await authService.registerUser('admin', 'admin@test.com', 'password123', 'admin');
    const adminLogin = await authService.loginUser('admin@test.com', 'password123');
    adminToken = adminLogin.token;

    regularUser = await authService.registerUser('user', 'user@test.com', 'password123', 'user');
    const userLogin = await authService.loginUser('user@test.com', 'password123');
    userToken = userLogin.token;
  });

  afterEach(async () => {
    // Clean up products after each test
    await Product.destroy({ truncate: true, cascade: true });
    await clearCache('products:*'); // Clear cache after each test to ensure fresh state
  });

  describe('POST /api/v1/products', () => {
    it('should allow an authenticated user to create a product', async () => {
      const newProduct = {
        name: 'Test Product',
        description: 'This is a test product description.',
        price: 99.99,
        stock: 10,
      };
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProduct);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toEqual(newProduct.name);
      expect(res.body.userId).toEqual(regularUser.id);
    });

    it('should allow an admin user to create a product', async () => {
      const newProduct = {
        name: 'Admin Product',
        description: 'Product created by admin.',
        price: 199.99,
        stock: 5,
      };
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct);

      expect(res.statusCode).toEqual(201);
      expect(res.body.userId).toEqual(adminUser.id);
    });

    it('should return 401 if no token is provided', async () => {
      const newProduct = { name: 'Unauthorized', description: 'desc', price: 10, stock: 1 };
      const res = await request(app)
        .post('/api/v1/products')
        .send(newProduct);

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Authentication required');
    });

    it('should return 400 for invalid product data', async () => {
      const invalidProduct = {
        name: 'a', // Too short
        description: 'short', // Too short
        price: -10, // Negative price
        stock: 'abc', // Invalid stock
      };
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidProduct);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation Error');
      expect(res.body.errors).toBeInstanceOf(Array);
      expect(res.body.errors.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/products', () => {
    beforeEach(async () => {
      // Seed some products for testing pagination and search
      await Product.create({ name: 'Product A', description: 'Desc A', price: 10, stock: 1, userId: regularUser.id });
      await Product.create({ name: 'Product B', description: 'Desc B', price: 20, stock: 2, userId: adminUser.id });
      await Product.create({ name: 'Special Item', description: 'Something special', price: 30, stock: 3, userId: regularUser.id });
    });

    it('should return all products with default pagination', async () => {
      const res = await request(app).get('/api/v1/products');

      expect(res.statusCode).toEqual(200);
      expect(res.body.products).toBeInstanceOf(Array);
      expect(res.body.products.length).toEqual(3);
      expect(res.body.total).toEqual(3);
      expect(res.body.page).toEqual(1);
      expect(res.body.limit).toEqual(10);
    });

    it('should return products with custom pagination', async () => {
      const res = await request(app).get('/api/v1/products?page=1&limit=2');

      expect(res.statusCode).toEqual(200);
      expect(res.body.products.length).toEqual(2);
      expect(res.body.total).toEqual(3);
      expect(res.body.page).toEqual(1);
      expect(res.body.limit).toEqual(2);
    });

    it('should return products filtered by search term', async () => {
      const res = await request(app).get('/api/v1/products?search=Product');

      expect(res.statusCode).toEqual(200);
      expect(res.body.products.length).toEqual(2);
      expect(res.body.products.map(p => p.name)).toEqual(expect.arrayContaining(['Product A', 'Product B']));
    });

    it('should return empty array if no products match search', async () => {
      const res = await request(app).get('/api/v1/products?search=NonExistent');

      expect(res.statusCode).toEqual(200);
      expect(res.body.products.length).toEqual(0);
      expect(res.body.total).toEqual(0);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    let product;
    beforeEach(async () => {
      product = await Product.create({ name: 'Single Product', description: 'Desc', price: 10, stock: 1, userId: regularUser.id });
    });

    it('should return a product by ID', async () => {
      const res = await request(app).get(`/api/v1/products/${product.id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toEqual(product.name);
      expect(res.body).toHaveProperty('User'); // Ensure user association is loaded
      expect(res.body.User.email).toEqual(regularUser.email);
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app).get('/api/v1/products/9999');

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('Product with ID 9999 not found');
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app).get('/api/v1/products/abc');

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation Error');
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    let ownedProduct, otherProduct;
    beforeEach(async () => {
      ownedProduct = await Product.create({ name: 'Owned Product', description: 'Desc', price: 10, stock: 1, userId: regularUser.id });
      otherProduct = await Product.create({ name: 'Other Product', description: 'Desc', price: 20, stock: 2, userId: adminUser.id });
    });

    it('should allow owner to update their product', async () => {
      const updatedData = { name: 'Updated Owned Product', price: 15.00 };
      const res = await request(app)
        .put(`/api/v1/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toEqual(updatedData.name);
      expect(res.body.price).toEqual(updatedData.price.toFixed(2));
    });

    it('should allow admin to update any product', async () => {
      const updatedData = { name: 'Updated Other Product by Admin', stock: 5 };
      const res = await request(app)
        .put(`/api/v1/products/${otherProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.name).toEqual(updatedData.name);
      expect(res.body.stock).toEqual(updatedData.stock);
    });

    it('should return 403 if a user tries to update another user\'s product', async () => {
      const updatedData = { name: 'Forbidden Update' };
      const res = await request(app)
        .put(`/api/v1/products/${otherProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('You do not have permission to update this product');
    });

    it('should return 401 if no token provided', async () => {
      const updatedData = { name: 'Unauthorized Update' };
      const res = await request(app)
        .put(`/api/v1/products/${ownedProduct.id}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(401);
    });

    it('should return 404 if product not found', async () => {
      const updatedData = { name: 'Non Existent Product' };
      const res = await request(app)
        .put('/api/v1/products/9999')
        .set('Authorization', `Bearer ${userToken}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(404);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = { price: 'invalid' };
      const res = await request(app)
        .put(`/api/v1/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(invalidData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation Error');
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    let ownedProduct, otherProduct;
    beforeEach(async () => {
      ownedProduct = await Product.create({ name: 'Owned Product', description: 'Desc', price: 10, stock: 1, userId: regularUser.id });
      otherProduct = await Product.create({ name: 'Other Product', description: 'Desc', price: 20, stock: 2, userId: adminUser.id });
    });

    it('should allow owner to delete their product', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(204);
      const productInDb = await Product.findByPk(ownedProduct.id);
      expect(productInDb).toBeNull();
    });

    it('should allow admin to delete any product', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${otherProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
      const productInDb = await Product.findByPk(otherProduct.id);
      expect(productInDb).toBeNull();
    });

    it('should return 403 if a user tries to delete another user\'s product', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${otherProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('You do not have permission to delete this product');
    });

    it('should return 401 if no token provided', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${ownedProduct.id}`);

      expect(res.statusCode).toEqual(401);
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app)
        .delete('/api/v1/products/9999')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });
});
```