```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/db');
const { User, Product, Category } = require('../../src/models');
const { generateAuthTokens } = require('../../src/utils/jwt');
const { hashPassword } = require('../../src/utils/password');
const { ROLES, PRODUCT_AVAILABILITY } = require('../../src/config/constants');
const { v4: uuidv4 } = require('uuid');

describe('Product Routes', () => {
  let adminUser, normalUser;
  let adminAccessToken, normalUserAccessToken;
  let testCategory;
  let testProduct;

  beforeAll(async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: true }); // Clear database for tests

    // Create a hashed password for users
    const hashedPassword = await hashPassword('password123');

    // Create admin user
    adminUser = await User.create({
      id: uuidv4(),
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@test.com',
      password: hashedPassword,
      role: ROLES.ADMIN,
      isEmailVerified: true,
    });
    const adminTokens = await generateAuthTokens(adminUser);
    adminAccessToken = adminTokens.access.token;

    // Create normal user
    normalUser = await User.create({
      id: uuidv4(),
      firstName: 'Normal',
      lastName: 'User',
      email: 'user@test.com',
      password: hashedPassword,
      role: ROLES.USER,
      isEmailVerified: true,
    });
    const userTokens = await generateAuthTokens(normalUser);
    normalUserAccessToken = userTokens.access.token;

    // Create a test category
    testCategory = await Category.create({
      id: uuidv4(),
      name: 'Electronics',
      description: 'Electronics devices',
    });

    // Create a test product
    testProduct = await Product.create({
      id: uuidv4(),
      name: 'Smartphone X',
      description: 'Latest smartphone model',
      price: 699.99,
      stockQuantity: 20,
      imageUrl: 'http://example.com/phone.jpg',
      categoryId: testCategory.id,
      availability: PRODUCT_AVAILABILITY.IN_STOCK,
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  // --- Product Routes ---
  describe('POST /api/v1/products', () => {
    test('should return 201 and create product if data is valid and user is admin', async () => {
      const newProduct = {
        name: 'Laptop Pro',
        description: 'Powerful laptop for professionals',
        price: 1200.00,
        stockQuantity: 15,
        imageUrl: 'http://example.com/laptop.jpg',
        categoryId: testCategory.id,
      };

      const res = await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: newProduct.name,
        price: '1200.00', // Sequelize returns price as string
        stockQuantity: newProduct.stockQuantity,
      }));

      const dbProduct = await Product.findByPk(res.body.id);
      expect(dbProduct).toBeDefined();
      expect(dbProduct.name).toBe(newProduct.name);
    });

    test('should return 401 if access token is missing', async () => {
      const newProduct = { name: 'Unauthorized Product', price: 10, stockQuantity: 10 };
      await request(app)
        .post('/api/v1/products')
        .send(newProduct)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if user is not admin', async () => {
      const newProduct = { name: 'Forbidden Product', price: 10, stockQuantity: 10 };
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send(newProduct)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 400 if required fields are missing', async () => {
      const invalidProduct = { description: 'missing name and price' };
      await request(app)
        .post('/api/v1/products')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(invalidProduct)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/products', () => {
    test('should return 200 and all products (paginated)', async () => {
      const res = await request(app)
        .get('/api/v1/products?limit=10&page=1')
        .expect(httpStatus.OK);

      expect(res.body).toEqual(expect.objectContaining({
        results: expect.any(Array),
        totalResults: expect.any(Number),
        page: 1,
        limit: 10,
        totalPages: expect.any(Number),
      }));
      expect(res.body.results.length).toBeGreaterThanOrEqual(1); // At least testProduct and Laptop Pro
    });

    test('should return 200 and filter products by name', async () => {
      const res = await request(app)
        .get(`/api/v1/products?name=Smartphone`)
        .expect(httpStatus.OK);

      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].name).toBe(testProduct.name);
    });

    test('should return 200 and populate category if requested', async () => {
      const res = await request(app)
        .get(`/api/v1/products?populate=category&name=Smartphone`)
        .expect(httpStatus.OK);

      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0].category).toBeDefined();
      expect(res.body.results[0].category.id).toBe(testCategory.id);
      expect(res.body.results[0].category.name).toBe(testCategory.name);
    });
  });

  describe('GET /api/v1/products/:productId', () => {
    test('should return 200 and product if found', async () => {
      const res = await request(app)
        .get(`/api/v1/products/${testProduct.id}`)
        .expect(httpStatus.OK);

      expect(res.body).toEqual(expect.objectContaining({
        id: testProduct.id,
        name: testProduct.name,
        description: testProduct.description,
      }));
    });

    test('should return 404 if product not found', async () => {
      await request(app)
        .get(`/api/v1/products/${uuidv4()}`) // Non-existent UUID
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('PATCH /api/v1/products/:productId', () => {
    test('should return 200 and update product if data is valid and user is admin', async () => {
      const updateBody = {
        price: 750.50,
        stockQuantity: 10,
      };

      const res = await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body).toEqual(expect.objectContaining({
        id: testProduct.id,
        price: '750.50',
        stockQuantity: 10,
      }));

      const dbProduct = await Product.findByPk(testProduct.id);
      expect(parseFloat(dbProduct.price)).toBe(750.50);
      expect(dbProduct.stockQuantity).toBe(10);
    });

    test('should return 401 if access token is missing', async () => {
      await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .send({ name: 'Updated name' })
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if user is not admin', async () => {
      await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send({ name: 'Updated name' })
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 404 if product not found', async () => {
      await request(app)
        .patch(`/api/v1/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Nonexistent' })
        .expect(httpStatus.NOT_FOUND);
    });

    test('should return 400 if update body is invalid (e.g., negative stock)', async () => {
      await request(app)
        .patch(`/api/v1/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ stockQuantity: -5 })
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('DELETE /api/v1/products/:productId', () => {
    let productToDelete;
    beforeEach(async () => {
      productToDelete = await Product.create({
        id: uuidv4(),
        name: 'Ephemeral Product',
        price: 10.00,
        stockQuantity: 5,
        categoryId: testCategory.id,
      });
    });

    test('should return 204 and delete product if user is admin', async () => {
      await request(app)
        .delete(`/api/v1/products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const dbProduct = await Product.findByPk(productToDelete.id);
      expect(dbProduct).toBeNull();
    });

    test('should return 401 if access token is missing', async () => {
      await request(app)
        .delete(`/api/v1/products/${productToDelete.id}`)
        .expect(httpStatus.UNAUTHORIZED);
    });

    test('should return 403 if user is not admin', async () => {
      await request(app)
        .delete(`/api/v1/products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    test('should return 404 if product not found', async () => {
      await request(app)
        .delete(`/api/v1/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  // --- Category Routes ---
  describe('POST /api/v1/categories', () => {
    test('should return 201 and create category if data is valid and user is admin', async () => {
      const newCategory = {
        name: 'Books',
        description: 'Fiction and non-fiction books',
      };

      const res = await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newCategory)
        .expect(httpStatus.CREATED);

      expect(res.body).toEqual(expect.objectContaining({
        id: expect.any(String),
        name: newCategory.name,
      }));

      const dbCategory = await Category.findByPk(res.body.id);
      expect(dbCategory).toBeDefined();
      expect(dbCategory.name).toBe(newCategory.name);
    });

    test('should return 400 if category name already exists', async () => {
      const duplicateCategory = { name: 'Books' }; // Already created above
      await request(app)
        .post('/api/v1/categories')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(duplicateCategory)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('GET /api/v1/categories', () => {
    test('should return 200 and all categories', async () => {
      const res = await request(app)
        .get('/api/v1/categories')
        .expect(httpStatus.OK);

      expect(res.body).toEqual(expect.any(Array));
      expect(res.body.length).toBeGreaterThanOrEqual(2); // Electronics and Books
      expect(res.body[0].name).toBeDefined();
    });
  });
});
```