import request from 'supertest';
import app from '../../src/app';
import { PrismaClient, UserRole } from '@prisma/client';
import { generateToken } from '../../src/utils/jwt.util';
import { hashPassword } from '../../src/utils/password.util';
import { config } from '../../src/config/env.config';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

describe('Product API Integration Tests', () => {
  let adminToken: string;
  let customerToken: string;
  let adminUserId: string;
  let customerUserId: string;
  let categoryId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Clear existing data (important for consistent tests)
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();

    // Create an admin user for testing authenticated routes
    const adminPasswordHash = await hashPassword('admin123');
    const adminUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Test Admin',
        email: 'testadmin@example.com',
        password: adminPasswordHash,
        role: UserRole.ADMIN,
      },
    });
    adminUserId = adminUser.id;
    adminToken = generateToken(adminUser.id);

    // Create a customer user for testing authorization
    const customerPasswordHash = await hashPassword('customer123');
    const customerUser = await prisma.user.create({
      data: {
        id: uuidv4(),
        name: 'Test Customer',
        email: 'testcustomer@example.com',
        password: customerPasswordHash,
        role: UserRole.CUSTOMER,
      },
    });
    customerUserId = customerUser.id;
    customerToken = generateToken(customerUser.id);

    // Create a category
    const category = await prisma.category.create({
      data: {
        id: uuidv4(),
        name: 'Test Category',
        slug: 'test-category',
        description: 'Category for integration tests',
      },
    });
    categoryId = category.id;

    // Create an initial product
    const product = await prisma.product.create({
      data: {
        id: uuidv4(),
        name: 'Initial Test Product',
        description: 'Description for initial test product',
        price: 100.00,
        stock: 10,
        categoryId: categoryId,
        imageUrl: 'http://example.com/initial.jpg',
      },
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
  });

  describe('GET /api/v1/products', () => {
    it('should return all products', async () => {
      const res = await request(app).get(`${config.apiVersion}/products`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.products).toBeInstanceOf(Array);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0]).toHaveProperty('name');
      expect(res.body.total).toBeGreaterThan(0);
    });

    it('should return products filtered by categoryId', async () => {
      const res = await request(app).get(`${config.apiVersion}/products?categoryId=${categoryId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.products).toBeInstanceOf(Array);
      expect(res.body.products.length).toBeGreaterThan(0);
      expect(res.body.products[0].categoryId).toBe(categoryId);
    });

    it('should return products filtered by search term', async () => {
      const res = await request(app).get(`${config.apiVersion}/products?search=Initial`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.products.length).toBeGreaterThanOrEqual(1);
      expect(res.body.products[0].name).toContain('Initial');
    });

    it('should return paginated products', async () => {
      const res = await request(app).get(`${config.apiVersion}/products?page=1&limit=1`);
      expect(res.statusCode).toEqual(200);
      expect(res.body.products.length).toBe(1);
      expect(res.body.page).toBe(1);
      expect(res.body.limit).toBe(1);
      expect(res.body.total).toBeGreaterThan(0);
    });
  });

  describe('GET /api/v1/products/:id', () => {
    it('should return a single product by ID', async () => {
      const res = await request(app).get(`${config.apiVersion}/products/${testProductId}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', testProductId);
      expect(res.body).toHaveProperty('name', 'Initial Test Product');
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app).get(`${config.apiVersion}/products/${uuidv4()}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Product not found');
    });
  });

  describe('POST /api/v1/products', () => {
    const newProduct = {
      name: 'New Product',
      description: 'A brand new product for sale',
      price: 25.50,
      stock: 50,
      categoryId: categoryId,
      imageUrl: 'http://example.com/new.jpg',
    };

    it('should create a new product if admin', async () => {
      const res = await request(app)
        .post(`${config.apiVersion}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', newProduct.name);
      expect(res.body.price).toBeCloseTo(newProduct.price);
    });

    it('should return 400 for invalid product data', async () => {
      const invalidProduct = { ...newProduct, name: 'a', price: -10 }; // Invalid name and price
      const res = await request(app)
        .post(`${config.apiVersion}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProduct);

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message');
      expect(res.body.message).toContain('Validation error');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post(`${config.apiVersion}/products`)
        .send(newProduct);
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Not authorized, no token');
    });

    it('should return 403 if authenticated as customer (not admin)', async () => {
      const res = await request(app)
        .post(`${config.apiVersion}/products`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(newProduct);
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', `User role ${UserRole.CUSTOMER} is not authorized to access this route`);
    });

    it('should return 400 if categoryId is invalid or not found', async () => {
      const productWithInvalidCategory = { ...newProduct, categoryId: uuidv4() };
      const res = await request(app)
        .post(`${config.apiVersion}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(productWithInvalidCategory);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', `Category with ID ${productWithInvalidCategory.categoryId} not found`);
    });
  });

  describe('PUT /api/v1/products/:id', () => {
    const updateData = {
      name: 'Updated Test Product',
      price: 120.00,
      stock: 15,
    };

    it('should update an existing product if admin', async () => {
      const res = await request(app)
        .put(`${config.apiVersion}/products/${testProductId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', testProductId);
      expect(res.body).toHaveProperty('name', updateData.name);
      expect(res.body.price).toBeCloseTo(updateData.price);
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app)
        .put(`${config.apiVersion}/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Product not found');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .put(`${config.apiVersion}/products/${testProductId}`)
        .send(updateData);
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 if authenticated as customer', async () => {
      const res = await request(app)
        .put(`${config.apiVersion}/products/${testProductId}`)
        .set('Authorization', `Bearer ${customerToken}`)
        .send(updateData);
      expect(res.statusCode).toEqual(403);
    });
  });

  describe('DELETE /api/v1/products/:id', () => {
    let productToDeleteId: string;

    beforeEach(async () => {
      // Create a product specifically for deletion in each test
      const product = await prisma.product.create({
        data: {
          id: uuidv4(),
          name: 'Product to Delete',
          description: 'This product will be deleted.',
          price: 5.00,
          stock: 1,
          categoryId: categoryId,
        },
      });
      productToDeleteId = product.id;
    });

    it('should delete a product if admin', async () => {
      const res = await request(app)
        .delete(`${config.apiVersion}/products/${productToDeleteId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);

      // Verify deletion
      const deletedProduct = await prisma.product.findUnique({
        where: { id: productToDeleteId },
      });
      expect(deletedProduct).toBeNull();
    });

    it('should return 404 if product to delete not found', async () => {
      const res = await request(app)
        .delete(`${config.apiVersion}/products/${uuidv4()}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Product not found');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .delete(`${config.apiVersion}/products/${productToDeleteId}`);
      expect(res.statusCode).toEqual(401);
    });

    it('should return 403 if authenticated as customer', async () => {
      const res = await request(app)
        .delete(`${config.apiVersion}/products/${productToDeleteId}`)
        .set('Authorization', `Bearer ${customerToken}`);
      expect(res.statusCode).toEqual(403);
    });
  });
});