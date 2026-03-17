```javascript
const request = require('supertest');
const app = require('../../src/app');
const db = require('../../src/database');
const { generateAuthTokens } = require('../../src/utils/jwt');
const redisClient = require('../../src/utils/redisClient');

jest.mock('../../src/utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

describe('ProductController Integration Tests', () => {
  let adminToken, userToken, adminUser, regularUser, productOwnedByAdmin;

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
    const { up: seedUp } = require('../../src/database/seeders/YYYYMMDDHHMMSS-initial-data');
    await seedUp(db.sequelize.queryInterface, db.sequelize.Sequelize);

    adminUser = await db.User.findOne({ where: { username: 'admin' } });
    regularUser = await db.User.findOne({ where: { username: 'testuser' } });

    // Ensure users have refresh tokens for generateAuthTokens to work fully in some setups
    adminUser.refreshToken = 'admin_refresh';
    regularUser.refreshToken = 'user_refresh';
    await adminUser.save();
    await regularUser.save();

    const adminAuth = generateAuthTokens(adminUser);
    adminToken = adminAuth.accessToken;
    
    const userAuth = generateAuthTokens(regularUser);
    userToken = userAuth.accessToken;

    productOwnedByAdmin = await db.Product.findOne({ where: { userId: adminUser.id } });

    // Ensure Redis client is ready or mocked if needed
    if (redisClient.isReady) {
      await redisClient.flushdb(); // Clear Redis cache before tests
    }
  });

  afterAll(async () => {
    if (redisClient.isReady) {
      await redisClient.flushdb();
      await redisClient.quit();
    }
  });

  describe('GET /api/v1/products', () => {
    it('should fetch all products without authentication', async () => {
      const res = await request(app).get('/api/v1/products');
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.products.length).toBeGreaterThan(0);
      expect(res.body.data.products[0]).toHaveProperty('owner');
    });

    it('should paginate results', async () => {
      const res = await request(app).get('/api/v1/products?page=1&limit=2');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.products).toHaveLength(2);
      expect(res.body.data.currentPage).toBe(1);
    });

    it('should filter by search query', async () => {
      const res = await request(app).get('/api/v1/products?search=Laptop');
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.products).toHaveLength(1);
      expect(res.body.data.products[0].name).toContain('Laptop');
    });

    it('should return 400 for invalid query parameters', async () => {
      const res = await request(app).get('/api/v1/products?page=abc');
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('"page" must be a number');
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should fetch a single product by ID without authentication', async () => {
      const res = await request(app).get(`/api/v1/products/${productOwnedByAdmin.id}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(productOwnedByAdmin.id);
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app).get('/api/v1/products/c1d2e3f4-a5b6-7890-1234-567890abcdef');
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not found');
    });

    it('should return 400 for invalid UUID format', async () => {
      const res = await request(app).get('/api/v1/products/invalid-uuid');
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('must be a valid UUID');
    });
  });

  describe('POST /api/v1/products', () => {
    const newProduct = {
      name: 'Integration Test Product',
      description: 'Product for integration testing.',
      price: 99.99,
      stock: 10,
      category: 'Test',
    };

    it('should create a new product for an authenticated user', async () => {
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(newProduct);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe(newProduct.name);
      expect(res.body.data.userId).toBe(regularUser.id);

      // Verify product is in DB
      const createdProduct = await db.Product.findByPk(res.body.data.id);
      expect(createdProduct).not.toBeNull();
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).post('/api/v1/products').send(newProduct);
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 for invalid product data', async () => {
      const invalidProduct = { ...newProduct, price: 'not-a-number' };
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProduct);

      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('"price" must be a number');
    });

    it('should return 409 if product name already exists', async () => {
      await db.Product.create({ ...newProduct, name: 'Existing Product Name', userId: adminUser.id }); // Create a product with this name

      const conflictingProduct = { ...newProduct, name: 'Existing Product Name' };
      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send(conflictingProduct);

      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    let productToUpdate;

    beforeEach(async () => {
      productToUpdate = await db.Product.create({
        name: 'Product to Update',
        description: 'Original description',
        price: 10.00,
        stock: 5,
        userId: regularUser.id,
      });
    });

    it('should update a product for the owner', async () => {
      const updateData = { description: 'Updated description', stock: 10 };
      const res = await request(app)
        .put(`/api/v1/products/${productToUpdate.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(updateData.description);
      expect(res.body.data.stock).toBe(updateData.stock);

      const updatedInDb = await db.Product.findByPk(productToUpdate.id);
      expect(updatedInDb.description).toBe(updateData.description);
    });

    it('should update a product for an admin', async () => {
      const updateData = { description: 'Admin updated description' };
      const res = await request(app)
        .put(`/api/v1/products/${productToUpdate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.description).toBe(updateData.description);
    });

    it('should return 403 if user tries to update another user\'s product', async () => {
      const productOwnedByAdminCopy = await db.Product.findByPk(productOwnedByAdmin.id); // Get fresh copy
      const updateData = { description: 'Trying to update someone else\'s' };
      const res = await request(app)
        .put(`/api/v1/products/${productOwnedByAdminCopy.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized'); // Authorization check is in service or controller.
      // Current implementation allows any authorized user to update. Needs adjustment for strict ownership.
      // For this test, let's assume `authorize('admin', 'user')` and actual ownership check within service/controller.
      // For this test to pass 403, productService.updateProduct would need to check req.user.id === product.userId
      // Let's refine the controller logic or service logic to include this if needed.
      // For now, based on provided `productController`, there is no explicit `product.userId === req.user.id` check.
      // It implies any user can modify any product if they are "admin" or "user" role.
      // I will adjust the controller to enforce this ownership check.

      // RETHINK: the `authorize('admin', 'user')` middleware allows ANY user OR admin.
      // The *ownership* logic should be in the service or controller.
      // Let's re-add ownership check to `updateProduct` and `deleteProduct` inside the controller/service
      // (as I did for users already).
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).put(`/api/v1/products/${productToUpdate.id}`).send({ name: 'No Auth' });
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app)
        .put('/api/v1/products/c1d2e3f4-a5b6-7890-1234-567890abcdef')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Non Existent' });
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 409 if updating name to an existing product name', async () => {
      await db.Product.create({ name: 'Another Product Name', price: 20, stock: 20, userId: adminUser.id });
      const res = await request(app)
        .put(`/api/v1/products/${productToUpdate.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Another Product Name' });
      expect(res.statusCode).toEqual(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    let productToDelete;

    beforeEach(async () => {
      productToDelete = await db.Product.create({
        name: 'Product to Delete',
        description: 'Temporary',
        price: 1.00,
        stock: 1,
        userId: adminUser.id,
      });
    });

    it('should soft delete a product for an admin', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
      expect(res.body).toEqual({}); // No content for 204

      const deletedProduct = await db.Product.findByPk(productToDelete.id, { paranoid: false });
      expect(deletedProduct.deletedAt).not.toBeNull();
    });

    it('should return 403 if a non-admin user tries to delete a product', async () => {
      const res = await request(app)
        .delete(`/api/v1/products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete(`/api/v1/products/${productToDelete.id}`);
      expect(res.statusCode).toEqual(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app)
        .delete('/api/v1/products/c1d2e3f4-a5b6-7890-1234-567890abcdef')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/products/:id/restore', () => {
    let softDeletedProduct;

    beforeEach(async () => {
      softDeletedProduct = await db.Product.create({
        name: 'Soft Deleted Product',
        description: 'Will be restored',
        price: 5.00,
        stock: 1,
        userId: adminUser.id,
      });
      await softDeletedProduct.destroy(); // Soft delete it
    });

    it('should restore a soft-deleted product for an admin', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${softDeletedProduct.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(softDeletedProduct.id);
      expect(res.body.data.deletedAt).toBeNull();

      const restoredProduct = await db.Product.findByPk(softDeletedProduct.id);
      expect(restoredProduct).not.toBeNull();
      expect(restoredProduct.deletedAt).toBeNull();
    });

    it('should return 403 if a non-admin user tries to restore a product', async () => {
      const res = await request(app)
        .post(`/api/v1/products/${softDeletedProduct.id}/restore`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('not authorized');
    });

    it('should return 404 if product not found for restoration', async () => {
      const res = await request(app)
        .post('/api/v1/products/c1d2e3f4-a5b6-7890-1234-567890abcdef/restore')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 if product is not soft-deleted', async () => {
      const activeProduct = await db.Product.create({
        name: 'Active Product', price: 10, stock: 10, userId: adminUser.id
      });
      const res = await request(app)
        .post(`/api/v1/products/${activeProduct.id}/restore`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('is not soft-deleted');
    });
  });
});
```