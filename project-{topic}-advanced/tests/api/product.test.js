```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { User, Product } = require('../../src/models');
const { generateAuthTokens } = require('../../src/utils/jwt');
const setupTestDB = require('../jest.setup');

setupTestDB();

describe('Product API', () => {
  let adminUser, regularUser;
  let adminAccessToken, regularAccessToken;
  let testProduct;

  beforeEach(async () => {
    // Clear data and create fresh users/products for each test
    await User.destroy({ truncate: true, cascade: true });
    await Product.destroy({ truncate: true, cascade: true });

    adminUser = await User.create({
      name: 'Admin Test',
      email: 'admin.prod@example.com',
      password: 'AdminPassword1',
      role: 'admin',
    });
    regularUser = await User.create({
      name: 'Regular Test',
      email: 'regular.prod@example.com',
      password: 'RegularPassword1',
      role: 'user',
    });

    adminAccessToken = generateAuthTokens(adminUser.id).access.token;
    regularAccessToken = generateAuthTokens(regularUser.id).access.token;

    testProduct = await Product.create({
      name: 'Test Product',
      description: 'A product for testing.',
      price: 100.00,
      stock: 10,
    });
  });

  describe('POST /api/v1/products', () => {
    const newProduct = {
      name: 'New Gadget',
      description: 'A cool new electronic device.',
      price: 250.00,
      stock: 50,
    };

    it('should allow admin to create a product', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.CREATED);

      expect(res.body.name).toBe(newProduct.name);
      expect(res.body.price).toBe(newProduct.price.toFixed(2)); // Decimal conversion
      expect(res.body.stock).toBe(newProduct.stock);

      const dbProduct = await Product.findByPk(res.body.id);
      expect(dbProduct).toBeDefined();
      expect(dbProduct.name).toBe(newProduct.name);
    });

    it('should not allow regular user to create a product', async () => {
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 401 if no authentication token is provided', async () => {
      await request(app)
        .post('/api/v1/products')
        .send(newProduct)
        .expect(httpStatus.UNAUTHORIZED);
    });

    it('should return 400 if product name already exists', async () => {
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ ...newProduct, name: testProduct.name }) // Duplicate name
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/products', () => {
    it('should allow admin to get all products', async () => {
      const res = await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results.length).toBeGreaterThanOrEqual(1); // At least testProduct
      expect(res.body.results[0].name).toBe(testProduct.name);
    });

    it('should allow regular user to get all products', async () => {
      await request(app)
        .get('/api/v1/products')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.OK);
    });

    it('should return 401 if no authentication token is provided', async () => {
      await request(app)
        .get('/api/v1/products')
        .expect(httpStatus.UNAUTHORIZED);
    });
  });

  describe('GET /api/v1/products/:productId', () => {
    it('should allow admin to get a product by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.name).toBe(testProduct.name);
    });

    it('should allow regular user to get a product by ID', async () => {
      await request(app)
        .get(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.OK);
    });

    it('should return 404 if product not found', async () => {
      await request(app)
        .get('/api/v1/products/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /api/v1/products/:productId', () => {
    const updateBody = {
      price: 120.50,
      stock: 15,
    };

    it('should allow admin to update a product', async () => {
      const res = await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.price).toBe(updateBody.price.toFixed(2));
      expect(res.body.stock).toBe(updateBody.stock);

      const dbProduct = await Product.findByPk(testProduct.id);
      expect(dbProduct.price).toBe(updateBody.price.toFixed(2));
      expect(dbProduct.stock).toBe(updateBody.stock);
    });

    it('should not allow regular user to update a product', async () => {
      await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 404 if product not found for update', async () => {
      await request(app)
        .patch('/api/v1/products/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.NOT_FOUND);
    });

    it('should return 400 if updating with existing product name', async () => {
      await Product.create({ name: 'Another Product', price: 50, stock: 5 });
      await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Another Product' })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /api/v1/products/:productId', () => {
    it('should allow admin to delete a product', async () => {
      await request(app)
        .delete(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const dbProduct = await Product.findByPk(testProduct.id);
      expect(dbProduct).toBeNull();
    });

    it('should not allow regular user to delete a product', async () => {
      await request(app)
        .delete(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 404 if product not found for deletion', async () => {
      await request(app)
        .delete('/api/v1/products/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
```