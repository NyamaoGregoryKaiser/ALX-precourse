```typescript
import request from 'supertest';
import app from '../../src/app';
import { prisma } from '../../src/database/prisma/client';
import { User, Product, Category, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../../src/config';
import { redisClient } from '../../src/utils/redisClient';

let adminToken: string;
let userToken: string;
let adminUser: User;
let testCategory: Category;
let testProduct: Product;

const generateToken = (id: string, role: Role) => {
  return jwt.sign({ id, role }, config.jwtSecret, { expiresIn: '1h' });
};

beforeAll(async () => {
  // Clear the database
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();
  await prisma.user.deleteMany();

  // Create an admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      password: adminPassword,
      name: 'Test Admin',
      role: Role.ADMIN,
    },
  });
  adminToken = generateToken(adminUser.id, Role.ADMIN);

  // Create a regular user
  const userPassword = await bcrypt.hash('user123', 12);
  const regularUser = await prisma.user.create({
    data: {
      email: 'user@test.com',
      password: userPassword,
      name: 'Test User',
      role: Role.USER,
    },
  });
  userToken = generateToken(regularUser.id, Role.USER);

  // Create a test category
  testCategory = await prisma.category.create({
    data: { name: 'Test Category' },
  });

  // Create a test product
  testProduct = await prisma.product.create({
    data: {
      name: 'Test Product',
      description: 'A description for test product.',
      price: 99.99,
      stock: 10,
      imageUrl: 'http://example.com/test-product.jpg',
      categoryId: testCategory.id,
    },
  });

  // Clear Redis cache
  await redisClient.flushdb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('Product Routes', () => {
  // --- Category Routes ---
  describe('POST /api/products/categories', () => {
    it('should create a new category (ADMIN)', async () => {
      const res = await request(app)
        .post('/api/products/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'New Category' });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.category).toHaveProperty('id');
      expect(res.body.data.category.name).toBe('New Category');
    });

    it('should return 409 if category name already exists (ADMIN)', async () => {
      const res = await request(app)
        .post('/api/products/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Test Category' }); // Already exists

      expect(res.statusCode).toEqual(409);
      expect(res.body.status).toBe('fail');
    });

    it('should return 403 if not ADMIN', async () => {
      const res = await request(app)
        .post('/api/products/categories')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'User Category' });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/products/categories')
        .send({ name: 'Guest Category' });

      expect(res.statusCode).toEqual(401);
    });
  });

  describe('GET /api/products/categories', () => {
    it('should get all categories (public)', async () => {
      const res = await request(app).get('/api/products/categories');

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.categories).toBeInstanceOf(Array);
      expect(res.body.data.categories.length).toBeGreaterThanOrEqual(1); // At least Test Category and New Category
    });
  });

  // --- Product Routes ---
  describe('POST /api/products', () => {
    it('should create a new product (ADMIN)', async () => {
      const newProductData = {
        name: 'New Gadget',
        description: 'A cool new gadget.',
        price: 150.00,
        stock: 20,
        imageUrl: 'http://example.com/new-gadget.jpg',
        categoryId: testCategory.id,
      };

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProductData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.product).toHaveProperty('id');
      expect(res.body.data.product.name).toBe('New Gadget');
    });

    it('should return 400 for invalid product data (ADMIN)', async () => {
      const invalidProductData = {
        name: 'Too short', // Invalid name
        price: -10, // Invalid price
        categoryId: testCategory.id,
        // Missing description, stock, imageUrl
      };

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidProductData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
    });

    it('should return 403 if not ADMIN', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'User Product',
          description: 'A product by user.',
          price: 10.00,
          stock: 5,
          imageUrl: 'http://example.com/user-product.jpg',
          categoryId: testCategory.id,
        });

      expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/products', () => {
    it('should get all products (public)', async () => {
      const res = await request(app).get('/api/products');

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.products).toBeInstanceOf(Array);
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(2); // Test Product + New Gadget
    });

    it('should filter products by search term', async () => {
      const res = await request(app).get('/api/products?search=gadget');

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.products[0].name).toBe('New Gadget');
    });

    it('should filter products by categoryId', async () => {
      const res = await request(app).get(`/api/products?categoryId=${testCategory.id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.products.length).toBeGreaterThanOrEqual(2); // New Gadget & Test Product
      expect(res.body.data.products.every((p: Product) => p.categoryId === testCategory.id)).toBe(true);
    });

    it('should paginate products', async () => {
      const res = await request(app).get('/api/products?page=1&limit=1');

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.products.length).toBe(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should get a product by ID (public)', async () => {
      const res = await request(app).get(`/api/products/${testProduct.id}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.product.id).toBe(testProduct.id);
      expect(res.body.data.product.name).toBe('Test Product');
      expect(res.body.data.product).toHaveProperty('category'); // Ensure category is included
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/products/non-existent-id');

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
    });
  });

  describe('PATCH /api/products/:id', () => {
    it('should update a product (ADMIN)', async () => {
      const res = await request(app)
        .patch(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 109.99, stock: 15 });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.product.id).toBe(testProduct.id);
      expect(res.body.data.product.price).toBe(109.99);
      expect(res.body.data.product.stock).toBe(15);
    });

    it('should return 400 for invalid update data (ADMIN)', async () => {
      const res = await request(app)
        .patch(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: -5 }); // Invalid price

      expect(res.statusCode).toEqual(400);
      expect(res.body.status).toBe('fail');
    });

    it('should return 403 if not ADMIN', async () => {
      const res = await request(app)
        .patch(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({ stock: 20 });

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 for non-existent product (ADMIN)', async () => {
      const res = await request(app)
        .patch('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should delete a product (ADMIN)', async () => {
      // First, create a new product to delete
      const productToDelete = await prisma.product.create({
        data: {
          name: 'Product to Delete',
          description: 'This product will be deleted.',
          price: 50.00,
          stock: 5,
          imageUrl: 'http://example.com/delete.jpg',
          categoryId: testCategory.id,
        },
      });

      const res = await request(app)
        .delete(`/api/products/${productToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
      expect(res.body).toEqual({}); // 204 No Content

      const deletedProduct = await prisma.product.findUnique({ where: { id: productToDelete.id } });
      expect(deletedProduct).toBeNull();
    });

    it('should return 403 if not ADMIN', async () => {
      const res = await request(app)
        .delete(`/api/products/${testProduct.id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toEqual(403);
    });

    it('should return 404 for non-existent product (ADMIN)', async () => {
      const res = await request(app)
        .delete('/api/products/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });
});
```