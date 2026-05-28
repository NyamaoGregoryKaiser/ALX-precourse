```javascript
const request = require('supertest');
const app = require('../../src/app');
const { sequelize, User, Category, Product } = require('../../src/config/db');
const { generateToken } = require('../../src/utils/jwt');

describe('Product Integration Tests', () => {
    let adminToken, userToken;
    let category1Id, category2Id;

    // Before all tests, set up database and create auth tokens
    beforeAll(async () => {
        if (sequelize.options.database !== 'ecommerce_test_db') {
            throw new Error('Integration tests must run against ecommerce_test_db!');
        }
        await sequelize.sync({ force: true }); // Clear and re-create tables

        // Create an admin user
        const adminUser = await User.create({
            username: 'admin',
            email: 'admin@test.com',
            password: 'adminpassword',
            role: 'admin'
        });
        adminToken = generateToken(adminUser.id);

        // Create a regular user
        const regularUser = await User.create({
            username: 'user',
            email: 'user@test.com',
            password: 'userpassword',
            role: 'user'
        });
        userToken = generateToken(regularUser.id);

        // Create categories
        const cat1 = await Category.create({ name: 'Electronics', description: 'Gadgets' });
        const cat2 = await Category.create({ name: 'Books', description: 'Reading material' });
        category1Id = cat1.id;
        category2Id = cat2.id;

        // Create some products
        await Product.bulkCreate([
            { name: 'Laptop', description: 'Powerful laptop', price: 1200.00, stock: 10, categoryId: category1Id },
            { name: 'Mouse', description: 'Wireless mouse', price: 25.00, stock: 50, categoryId: category1Id },
            { name: 'Fiction Book', description: 'A gripping novel', price: 15.00, stock: 200, categoryId: category2Id },
        ]);
    });

    // After all tests, close DB connection
    afterAll(async () => {
        await sequelize.close();
    });

    // --- Public Product Routes ---
    describe('GET /api/v1/products', () => {
        it('should fetch all products successfully', async () => {
            const res = await request(app).get('/api/v1/products');
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.products.length).toBeGreaterThanOrEqual(3);
            expect(res.body.data.products[0]).toHaveProperty('name');
            expect(res.body.data.products[0]).toHaveProperty('category');
        });

        it('should fetch products filtered by category', async () => {
            const res = await request(app).get(`/api/v1/products?categoryId=${category1Id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.products.length).toBe(2);
            res.body.data.products.forEach(p => expect(p.category.id).toBe(category1Id));
        });

        it('should fetch products with search query', async () => {
            const res = await request(app).get(`/api/v1/products?search=lap`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.products.length).toBe(1);
            expect(res.body.data.products[0].name).toBe('Laptop');
        });
    });

    describe('GET /api/v1/products/:id', () => {
        it('should fetch a single product by ID', async () => {
            const product = await Product.findOne({ where: { name: 'Laptop' } });
            const res = await request(app).get(`/api/v1/products/${product.id}`);
            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.product.name).toBe('Laptop');
            expect(res.body.data.product).toHaveProperty('category');
        });

        it('should return 404 if product not found', async () => {
            const res = await request(app).get('/api/v1/products/non-existent-id');
            expect(res.statusCode).toEqual(404);
            expect(res.body.status).toBe('fail');
            expect(res.body.message).toBe('Product not found');
        });
    });

    // --- Admin Product Routes ---
    describe('POST /api/v1/products', () => {
        it('should allow admin to create a new product', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Smartwatch',
                    description: 'Wearable tech',
                    price: 250.00,
                    imageUrl: 'http://example.com/smartwatch.jpg',
                    stock: 20,
                    categoryId: category1Id
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body.status).toBe('success');
            expect(res.body.data.product.name).toBe('Smartwatch');
            const productInDb = await Product.findByPk(res.body.data.product.id);
            expect(productInDb).not.toBeNull();
        });

        it('should return 403 if regular user tries to create a product', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .set('Authorization', `Bearer ${userToken}`)
                .send({
                    name: 'Unauthorized Product',
                    price: 10.00,
                    stock: 5,
                    categoryId: category1Id
                });
            expect(res.statusCode).toEqual(403);
            expect(res.body.status).toBe('fail');
        });

        it('should return 401 if unauthenticated user tries to create a product', async () => {
            const res = await request(app)
                .post('/api/v1/products')
                .send({
                    name: 'Unauthorized Product',
                    price: 10.00,
                    stock: 5,
                    categoryId: category1Id
                });
            expect(res.statusCode).toEqual(401);
            expect(res.body.status).toBe('fail');
        });
    });

    describe('PUT /api/v1/products/:id', () => {
        let productIdToUpdate;
        beforeAll(async () => {
            const product = await Product.create({
                name: 'Old Product Name',
                description: 'Old description',
                price: 10.00,
                stock: 10,
                categoryId: category1Id
            });
            productIdToUpdate = product.id;
        });

        it('should allow admin to update a product', async () => {
            const res = await request(app)
                .put(`/api/v1/products/${productIdToUpdate}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send({
                    name: 'Updated Product Name',
                    price: 20.00
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body.status).toBe('success');
            expect(res.body.data.product.name).toBe('Updated Product Name');
            expect(res.body.data.product.price).toBe('20.00'); // Sequelize returns decimal as string
            const productInDb = await Product.findByPk(productIdToUpdate);
            expect(productInDb.name).toBe('Updated Product Name');
        });

        it('should return 404 if admin tries to update non-existent product', async () => {
            const res = await request(app)
                .put('/api/v1/products/non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ name: 'Non Existent' });
            expect(res.statusCode).toEqual(404);
            expect(res.body.status).toBe('fail');
        });
    });

    describe('DELETE /api/v1/products/:id', () => {
        let productIdToDelete;
        beforeAll(async () => {
            const product = await Product.create({
                name: 'Product to Delete',
                description: 'Will be deleted',
                price: 5.00,
                stock: 5,
                categoryId: category2Id
            });
            productIdToDelete = product.id;
        });

        it('should allow admin to delete a product', async () => {
            const res = await request(app)
                .delete(`/api/v1/products/${productIdToDelete}`)
                .set('Authorization', `Bearer ${adminToken}`);

            expect(res.statusCode).toEqual(204);
            expect(res.body).toEqual({}); // 204 No Content typically returns empty body
            const productInDb = await Product.findByPk(productIdToDelete);
            expect(productInDb).toBeNull();
        });

        it('should return 404 if admin tries to delete non-existent product', async () => {
            const res = await request(app)
                .delete('/api/v1/products/another-non-existent-id')
                .set('Authorization', `Bearer ${adminToken}`);
            expect(res.statusCode).toEqual(404);
            expect(res.body.status).toBe('fail');
        });
    });
});
```