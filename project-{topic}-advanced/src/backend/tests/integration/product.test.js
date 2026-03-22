```javascript
const request = require('supertest');
const app = require('../../app');
const sequelize = require('../../config/database');
const Product = require('../../models/Product');
const User = require('../../models/User');
const { generateToken } = require('../../utils/jwtUtils');
const { productCache } = require('../../middleware/cacheMiddleware');
const { StatusCodes } = require('http-status-codes');

let adminToken;
let userToken;
let adminUser;
let regularUser;

describe('Product API Integration Tests', () => {
    beforeAll(async () => {
        // Ensure the database is clean and migrated for testing
        // This is a common pattern for integration tests to ensure isolated tests
        await sequelize.sync({ force: true }); // DANGER: This drops tables! Use only for test DB.

        adminUser = await User.create({
            email: 'admin@test.com',
            password: 'adminpassword',
            role: 'admin',
        }, { context: { isAdminCreation: true } });

        regularUser = await User.create({
            email: 'user@test.com',
            password: 'userpassword',
            role: 'user',
        });

        adminToken = generateToken(adminUser.id, adminUser.role);
        userToken = generateToken(regularUser.id, regularUser.role);

        productCache.flushAll(); // Clear any existing cache
    });

    afterAll(async () => {
        await sequelize.close();
    });

    beforeEach(async () => {
        // Clean products table before each test
        await Product.destroy({ truncate: true, cascade: true });
        productCache.flushAll(); // Clear cache before each test
    });

    // --- Create Product Tests ---
    describe('POST /api/v1/products', () => {
        it('should create a new product if authenticated as admin', async () => {
            const productData = {
                name: 'Test Product',
                description: 'This is a test product description.',
                price: 99.99,
                quantity: 10,
                category: 'Electronics',
                imageUrl: 'http://example.com/test.jpg',
            };

            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(productData);

            expect(res.statusCode).toEqual(StatusCodes.CREATED);
            expect(res.body.status).toBe('success');
            expect(res.body.data).toHaveProperty('id');
            expect(res.body.data.name).toBe(productData.name);
            expect(res.body.data.quantity).toBe(productData.quantity);

            const productInDb = await Product.findByPk(res.body.data.id);
            expect(productInDb).toBeDefined();
            expect(productInDb.name).toBe(productData.name);
        });

        it('should return 403 if authenticated as a regular user', async () => {
            const productData = {
                name: 'Forbidden Product',
                description: 'Description',
                price: 10.00,
                quantity: 1,
            };

            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${userToken}`)
                .send(productData);

            expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
            expect(res.body.message).toBe('You do not have permission to perform this action');
        });

        it('should return 401 if not authenticated', async () => {
            const productData = {
                name: 'Unauthorized Product',
                description: 'Description',
                price: 10.00,
                quantity: 1,
            };

            const res = await request(app)
                .post('/api/v1/products')
                .send(productData);

            expect(res.statusCode).toEqual(StatusCodes.UNAUTHORIZED);
            expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
        });

        it('should return 400 for invalid product data', async () => {
            const invalidProductData = {
                name: 'Sh', // Too short
                description: 'Short', // Too short
                price: -10.00, // Negative price
                quantity: 'abc', // Not an integer
            };

            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidProductData);

            expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
            expect(res.body.message).toContain('Product name must be at least 3 characters long');
            expect(res.body.message).toContain('Product description must be at least 10 characters long');
            expect(res.body.message).toContain('Price cannot be negative');
            expect(res.body.message).toContain('Quantity must be an integer');
        });

        it('should return 409 for duplicate product name', async () => {
            await Product.create({
                name: 'Existing Product',
                description: 'Original description',
                price: 50.00,
                quantity: 5,
            });

            const duplicateProductData = {
                name: 'Existing Product',
                description: 'New description',
                price: 60.00,
                quantity: 10,
            };

            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(duplicateProductData);

            expect(res.statusCode).toEqual(StatusCodes.CONFLICT);
            expect(res.body.message).toContain('Duplicate field value: "Existing Product". Please use another value!');
        });
    });

    // --- Get All Products Tests ---
    describe('GET /api/v1/products', () => {
        it('should retrieve all products if authenticated', async () => {
            await Product.create({ name: 'Product A', description: 'Desc A', price: 10.00, quantity: 1 });
            await Product.create({ name: 'Product B', description: 'Desc B', price: 20.00, quantity: 2 });

            const res = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(StatusCodes.OK);
            expect(res.body.status).toBe('success');
            expect(res.body.results).toBe(2);
            expect(res.body.data.length).toBe(2);
            expect(res.body.data[0].name).toBe('Product B'); // Default sort by createdAt DESC
        });

        it('should filter products by name', async () => {
            await Product.create({ name: 'Product Apple', description: 'Desc A', price: 10.00, quantity: 1 });
            await Product.create({ name: 'Product Banana', description: 'Desc B', price: 20.00, quantity: 2 });

            const res = await request(app)
                .get('/api/v1/products?name=apple')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(StatusCodes.OK);
            expect(res.body.results).toBe(1);
            expect(res.body.data[0].name).toBe('Product Apple');
        });

        it('should apply pagination and return correct limit', async () => {
            for (let i = 1; i <= 5; i++) {
                await Product.create({
                    name: `Product ${i}`,
                    description: `Description ${i}`,
                    price: 10.00 * i,
                    quantity: i,
                });
            }

            const res = await request(app)
                .get('/api/v1/products?page=1&limit=2')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(StatusCodes.OK);
            expect(res.body.results).toBe(2);
            expect(res.body.data.length).toBe(2);
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(2);
        });

        it('should use cache for subsequent requests', async () => {
            await Product.create({ name: 'Cached Product', description: 'Desc', price: 1.00, quantity: 1 });

            // First request, should populate cache
            const res1 = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res1.statusCode).toEqual(StatusCodes.OK);
            expect(productCache.has('/api/v1/products')).toBe(true);

            // Add another product, this should not affect the cached response
            await Product.create({ name: 'New Product', description: 'New Desc', price: 2.00, quantity: 2 });

            // Second request, should hit cache and return old data
            const res2 = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res2.statusCode).toEqual(StatusCodes.OK);
            expect(res2.body.results).toBe(1); // Still 1 because it's from cache
            expect(res2.body.data[0].name).toBe('Cached Product');
        });

        it('should bypass cache and return updated data if cache is cleared by POST/PATCH/DELETE', async () => {
            const product = await Product.create({ name: 'Cached Item', description: 'Desc', price: 1.00, quantity: 1 });

            // First request, populate cache
            await request(app).get('/api/v1/products').set('Authorization', `Bearer ${userToken}`);
            expect(productCache.has('/api/v1/products')).toBe(true);

            // Update product (this should clear cache)
            await request(app)
                .patch(`/api/v1/products/${product.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Updated Cached Item' });

            expect(productCache.has('/api/v1/products')).toBe(false); // Cache should be cleared

            // Third request, should hit DB and return updated data
            const res3 = await request(app)
                .get('/api/v1/products')
                .set('Authorization', `Bearer ${userToken}`);

            expect(res3.statusCode).toEqual(StatusCodes.OK);
            expect(res3.body.results).toBe(1);
            expect(res3.body.data[0].name).toBe('Updated Cached Item'); // Now returns updated name
        });
    });

    // --- Get Product By ID Tests ---
    describe('GET /api/v1/products/:id', () => {
        it('should retrieve a single product by ID if authenticated', async () => {
            const product = await Product.create({ name: 'Unique Product', description: 'Details', price: 100.00, quantity: 5 });

            const res = await request(app)
                .get(`/api/v1/products/${product.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(StatusCodes.OK);
            expect(res.body.status).toBe('success');
            expect(res.body.data.name).toBe('Unique Product');
        });

        it('should return 404 if product ID does not exist', async () => {
            const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef'; // A valid UUID format, but not in DB

            const res = await request(app)
                .get(`/api/v1/products/${nonExistentId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
            expect(res.body.message).toBe('Product not found with that ID');
        });

        it('should return 400 for invalid UUID format', async () => {
            const invalidId = 'not-a-uuid';

            const res = await request(app)
                .get(`/api/v1/products/${invalidId}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
            expect(res.body.message).toContain('Invalid id');
        });
    });

    // --- Update Product Tests ---
    describe('PATCH /api/v1/products/:id', () => {
        it('should update an existing product if authenticated as admin', async () => {
            const product = await Product.create({ name: 'Old Product', description: 'Old Desc', price: 10.00, quantity: 5 });
            const updateData = {
                name: 'Updated Product Name',
                price: 15.50,
            };

            const res = await request(app)
                .patch(`/api/v1/products/${product.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData);

            expect(res.statusCode).toEqual(StatusCodes.OK);
            expect(res.body.status).toBe('success');
            expect(res.body.data.name).toBe(updateData.name);
            expect(parseFloat(res.body.data.price)).toBe(updateData.price);

            const updatedProductInDb = await Product.findByPk(product.id);
            expect(updatedProductInDb.name).toBe(updateData.name);
            expect(parseFloat(updatedProductInDb.price)).toBe(updateData.price);
        });

        it('should return 403 if authenticated as a regular user', async () => {
            const product = await Product.create({ name: 'Old Product', description: 'Old Desc', price: 10.00, quantity: 5 });
            const updateData = { name: 'Updated Product Name' };

            const res = await request(app)
                .patch(`/api/v1/products/${product.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateData);

            expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
            expect(res.body.message).toBe('You do not have permission to perform this action');
        });

        it('should return 404 if product ID does not exist', async () => {
            const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';
            const updateData = { name: 'Non Existent' };

            const res = await request(app)
                .patch(`/api/v1/products/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateData);

            expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
            expect(res.body.message).toBe('Product not found with that ID');
        });

        it('should return 400 for invalid update data', async () => {
            const product = await Product.create({ name: 'Valid Product', description: 'Valid Desc', price: 10.00, quantity: 5 });
            const invalidUpdateData = { price: 'not-a-number' };

            const res = await request(app)
                .patch(`/api/v1/products/${product.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidUpdateData);

            expect(res.statusCode).toEqual(StatusCodes.BAD_REQUEST);
            expect(res.body.message).toContain('Price must be a number');
        });
    });

    // --- Delete Product Tests ---
    describe('DELETE /api/v1/products/:id', () => {
        it('should delete an existing product if authenticated as admin', async () => {
            const product = await Product.create({ name: 'Product to Delete', description: 'To be deleted', price: 20.00, quantity: 3 });

            const res = await request(app)
                .delete(`/api/v1/products/${product.id}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(StatusCodes.NO_CONTENT);

            const deletedProduct = await Product.findByPk(product.id);
            expect(deletedProduct).toBeNull();
        });

        it('should return 403 if authenticated as a regular user', async () => {
            const product = await Product.create({ name: 'Product to Delete', description: 'To be deleted', price: 20.00, quantity: 3 });

            const res = await request(app)
                .delete(`/api/v1/products/${product.id}`)
                .set('Authorization', `Bearer ${userToken}`);

            expect(res.statusCode).toEqual(StatusCodes.FORBIDDEN);
            expect(res.body.message).toBe('You do not have permission to perform this action');
        });

        it('should return 404 if product ID does not exist', async () => {
            const nonExistentId = 'a1b2c3d4-e5f6-7890-1234-567890abcdef';

            const res = await request(app)
                .delete(`/api/v1/products/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(StatusCodes.NOT_FOUND);
            expect(res.body.message).toBe('Product not found with that ID');
        });
    });
});
```