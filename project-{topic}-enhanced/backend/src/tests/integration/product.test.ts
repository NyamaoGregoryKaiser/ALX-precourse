```typescript
import request from 'supertest';
import app from '../../app';
import { AppDataSource } from '../../config/database';
import { User } from '../../entities/User';
import { Product } from '../../entities/Product';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { config } from '../../config';
import * as cache from '../../utils/cache';

describe('Product API Endpoints', () => {
  let adminUser: User;
  let adminToken: string;
  let normalUser: User;
  let normalUserToken: string;
  let ownedProduct: Product;
  let otherUserProduct: Product;

  beforeEach(async () => {
    // Clear and re-sync database before each test
    await AppDataSource.dropDatabase();
    await AppDataSource.synchronize();

    // Create admin user
    const hashedAdminPassword = await bcrypt.hash('adminpassword', 10);
    adminUser = AppDataSource.getRepository(User).create({
      email: 'admin@test.com',
      password: hashedAdminPassword,
      role: 'admin',
    });
    await AppDataSource.getRepository(User).save(adminUser);
    adminToken = jwt.sign({ userId: adminUser.id, role: adminUser.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    // Create normal user
    const hashedNormalPassword = await bcrypt.hash('normalpassword', 10);
    normalUser = AppDataSource.getRepository(User).create({
      email: 'normal@test.com',
      password: hashedNormalPassword,
      role: 'user',
    });
    await AppDataSource.getRepository(User).save(normalUser);
    normalUserToken = jwt.sign({ userId: normalUser.id, role: normalUser.role }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });

    // Create a product owned by the normal user
    ownedProduct = AppDataSource.getRepository(Product).create({
      name: 'My Owned Product',
      description: 'A product owned by normal user',
      price: 100.00,
      isActive: true,
      userId: normalUser.id,
    });
    await AppDataSource.getRepository(Product).save(ownedProduct);

    // Create a product owned by the admin user
    otherUserProduct = AppDataSource.getRepository(Product).create({
      name: 'Admin\'s Product',
      description: 'A product owned by admin',
      price: 200.00,
      isActive: true,
      userId: adminUser.id,
    });
    await AppDataSource.getRepository(Product).save(otherUserProduct);

    // Clear cache before each test to ensure fresh state
    cache.flushCache();
  });

  // --- GET /api/products ---
  describe('GET /api/products', () => {
    it('should return all products for an authenticated user', async () => {
      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('user'); // Should include user details
      expect(res.body.some((p: Product) => p.id === ownedProduct.id)).toBe(true);
      expect(res.body.some((p: Product) => p.id === otherUserProduct.id)).toBe(true);
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/products');

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('message', 'Authentication failed: No token provided');
    });

    it('should use cache for subsequent calls', async () => {
      // First call, should populate cache
      await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`);

      // Mock getCache to return cached data
      const spyGetCache = jest.spyOn(cache, 'getCache');
      const spySetCache = jest.spyOn(cache, 'setCache');
      spyGetCache.mockReturnValue(true); // Simulate a cache hit

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(200);
      expect(spyGetCache).toHaveBeenCalledWith('allProducts');
      // No database call should happen if cache is hit.
      // We can't directly check if TypeORM's find was called via Supertest,
      // but the mock for getCache ensures the service layer thinks it's cached.
      expect(spySetCache).not.toHaveBeenCalledWith('allProducts', expect.anything()); // No setting on cache hit
      spyGetCache.mockRestore(); // Restore original function
      spySetCache.mockRestore();
    });
  });

  // --- GET /api/products/:id ---
  describe('GET /api/products/:id', () => {
    it('should return a specific product for an authenticated user', async () => {
      const res = await request(app)
        .get(`/api/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('id', ownedProduct.id);
      expect(res.body).toHaveProperty('name', ownedProduct.name);
    });

    it('should return 404 if product not found', async () => {
      const res = await request(app)
        .get(`/api/products/non-existent-uuid`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Product not found');
    });
  });

  // --- POST /api/products ---
  describe('POST /api/products', () => {
    const newProductData = {
      name: 'Brand New Product',
      description: 'Created by normal user',
      price: 150.00,
      isActive: true,
    };

    it('should allow an authenticated user to create a product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send(newProductData);

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'Product created successfully');
      expect(res.body.product).toHaveProperty('name', newProductData.name);
      expect(res.body.product).toHaveProperty('userId', normalUser.id);

      const productInDb = await AppDataSource.getRepository(Product).findOneBy({ name: newProductData.name });
      expect(productInDb).not.toBeNull();
      expect(productInDb!.userId).toEqual(normalUser.id);
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ description: 'only description' }); // Missing name and price

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('message', 'Name and price are required for a product');
    });

    it('should return 409 if product name already exists', async () => {
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send(newProductData); // Create it once

      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send(newProductData); // Try to create again with same name

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('message', 'Product with this name already exists');
    });

    it('should invalidate cache on successful creation', async () => {
      const spyDeleteCache = jest.spyOn(cache, 'deleteCache');
      await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send(newProductData);

      expect(spyDeleteCache).toHaveBeenCalledWith('allProducts');
      spyDeleteCache.mockRestore();
    });
  });

  // --- PUT /api/products/:id ---
  describe('PUT /api/products/:id', () => {
    it('should allow owner to update their product', async () => {
      const updateData = { price: 120.00, isActive: false };
      const res = await request(app)
        .put(`/api/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Product updated successfully');
      expect(res.body.product).toHaveProperty('id', ownedProduct.id);
      expect(res.body.product).toHaveProperty('price', '120.00'); // Price is string from DB
      expect(res.body.product).toHaveProperty('isActive', false);
    });

    it('should allow admin to update any product', async () => {
      const updateData = { name: 'Updated Admin Product', price: 250.00 };
      const res = await request(app)
        .put(`/api/products/${ownedProduct.id}`) // Admin updates normal user's product
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Product updated successfully');
      expect(res.body.product).toHaveProperty('id', ownedProduct.id);
      expect(res.body.product).toHaveProperty('name', updateData.name);
    });

    it('should return 403 if non-owner/non-admin tries to update product', async () => {
      const res = await request(app)
        .put(`/api/products/${otherUserProduct.id}`) // Normal user tries to update admin's product
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ price: 300.00 });

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Forbidden: You can only update products you own or as an administrator');
    });

    it('should return 404 if product not found for update', async () => {
      const res = await request(app)
        .put(`/api/products/non-existent-uuid`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ price: 10.00 });

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Product not found');
    });

    it('should return 409 if updated name conflicts with another product', async () => {
      const res = await request(app)
        .put(`/api/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ name: otherUserProduct.name }); // Try to change ownedProduct's name to admin's product name

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('message', 'Product not found or name already exists');
    });

    it('should invalidate cache on successful update', async () => {
      const spyDeleteCache = jest.spyOn(cache, 'deleteCache');
      await request(app)
        .put(`/api/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`)
        .send({ price: 123.45 });

      expect(spyDeleteCache).toHaveBeenCalledWith('allProducts');
      spyDeleteCache.mockRestore();
    });
  });

  // --- DELETE /api/products/:id ---
  describe('DELETE /api/products/:id', () => {
    it('should allow owner to delete their product', async () => {
      const res = await request(app)
        .delete(`/api/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(204); // No content
      const productInDb = await AppDataSource.getRepository(Product).findOneBy({ id: ownedProduct.id });
      expect(productInDb).toBeNull();
    });

    it('should allow admin to delete any product', async () => {
      const res = await request(app)
        .delete(`/api/products/${ownedProduct.id}`) // Admin deletes normal user's product
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
      const productInDb = await AppDataSource.getRepository(Product).findOneBy({ id: ownedProduct.id });
      expect(productInDb).toBeNull();
    });

    it('should return 403 if non-owner/non-admin tries to delete product', async () => {
      const res = await request(app)
        .delete(`/api/products/${otherUserProduct.id}`) // Normal user tries to delete admin's product
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('message', 'Forbidden: You can only delete products you own or as an administrator');
    });

    it('should return 404 if product not found for deletion', async () => {
      const res = await request(app)
        .delete(`/api/products/non-existent-uuid`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Product not found');
    });

    it('should invalidate cache on successful deletion', async () => {
      const spyDeleteCache = jest.spyOn(cache, 'deleteCache');
      await request(app)
        .delete(`/api/products/${ownedProduct.id}`)
        .set('Authorization', `Bearer ${normalUserToken}`);

      expect(spyDeleteCache).toHaveBeenCalledWith('allProducts');
      spyDeleteCache.mockRestore();
    });
  });
});
```