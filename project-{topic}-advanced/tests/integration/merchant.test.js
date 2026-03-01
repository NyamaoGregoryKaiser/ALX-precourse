```javascript
// tests/integration/merchant.test.js
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { sequelize } = require('../../src/database');
const { User, Merchant } = require('../../src/models');
const { faker } = require('@faker-js/faker');
const { tokenTypes } = require('../../src/config/tokens');
const config = require('../../src/config/config');
const jwt = require('jsonwebtoken');

// ALX Principle: Integration Testing
// Test the interaction between multiple components (routes, controllers, services, models, database).

describe('Merchant routes', () => {
    let adminUser, adminAccessToken;
    let normalUser, normalUserAccessToken;

    beforeEach(async () => {
        await sequelize.sync({ force: true }); // Clear and re-create tables

        // Create an admin user
        adminUser = await User.create({
            id: faker.string.uuid(),
            name: 'Admin User',
            email: 'admin@example.com',
            password: 'AdminPassword123!',
            role: 'admin',
            isEmailVerified: true,
        });
        adminAccessToken = jwt.sign({ sub: adminUser.id, type: tokenTypes.ACCESS, iat: faker.date.recent().getTime() / 1000, exp: faker.date.future().getTime() / 1000 }, config.jwt.secret);

        // Create a normal user
        normalUser = await User.create({
            id: faker.string.uuid(),
            name: 'Normal User',
            email: 'user@example.com',
            password: 'UserPassword123!',
            role: 'user',
            isEmailVerified: true,
        });
        normalUserAccessToken = jwt.sign({ sub: normalUser.id, type: tokenTypes.ACCESS, iat: faker.date.recent().getTime() / 1000, exp: faker.date.future().getTime() / 1000 }, config.jwt.secret);
    });

    afterAll(async () => {
        await sequelize.close();
    });

    describe('POST /api/v1/merchants', () => {
        let newMerchantData;

        beforeEach(() => {
            newMerchantData = {
                name: faker.company.name(),
                email: faker.internet.email(),
                businessCategory: faker.commerce.department(),
            };
        });

        test('should return 201 and create merchant if authenticated as admin', async () => {
            const res = await request(app)
                .post('/api/v1/merchants')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(newMerchantData)
                .expect(httpStatus.CREATED);

            expect(res.body).toHaveProperty('id');
            expect(res.body.name).toBe(newMerchantData.name);
            expect(res.body.email).toBe(newMerchantData.email);
            expect(res.body).toHaveProperty('apiKey'); // API key should be generated
            expect(res.body).not.toHaveProperty('password'); // No password field on merchant
            expect(res.body.isActive).toBe(true);

            const dbMerchant = await Merchant.findByPk(res.body.id);
            expect(dbMerchant).toBeDefined();
            expect(dbMerchant.name).toBe(newMerchantData.name);
            expect(dbMerchant.email).toBe(newMerchantData.email);
            expect(dbMerchant.apiKey).toBeDefined(); // Raw API key in DB
            expect(dbMerchant.apiKey).not.toBe(res.body.apiKey); // toJSON filters raw API key
        });

        test('should return 401 if not authenticated', async () => {
            await request(app)
                .post('/api/v1/merchants')
                .send(newMerchantData)
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 403 if authenticated as normal user', async () => {
            await request(app)
                .post('/api/v1/merchants')
                .set('Authorization', `Bearer ${normalUserAccessToken}`)
                .send(newMerchantData)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 400 if email is already taken', async () => {
            await request(app)
                .post('/api/v1/merchants')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(newMerchantData)
                .expect(httpStatus.CREATED);

            await request(app)
                .post('/api/v1/merchants')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(newMerchantData)
                .expect(httpStatus.BAD_REQUEST);
        });

        test('should return 400 if required fields are missing', async () => {
            delete newMerchantData.name; // Missing name
            await request(app)
                .post('/api/v1/merchants')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(newMerchantData)
                .expect(httpStatus.BAD_REQUEST);
        });
    });

    describe('GET /api/v1/merchants', () => {
        let merchants;

        beforeEach(async () => {
            merchants = [];
            for (let i = 0; i < 3; i++) {
                merchants.push(await Merchant.create({
                    id: faker.string.uuid(),
                    name: `Merchant ${i + 1}`,
                    email: `merchant${i + 1}@example.com`,
                    businessCategory: faker.commerce.department(),
                    apiKey: `sk_test_${faker.string.uuid()}`,
                    isActive: true,
                }));
            }
        });

        test('should return 200 and all merchants if authenticated as admin', async () => {
            const res = await request(app)
                .get('/api/v1/merchants')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(httpStatus.OK);

            expect(res.body).toHaveProperty('results');
            expect(res.body.results).toHaveLength(merchants.length);
            expect(res.body.results[0]).not.toHaveProperty('apiKey'); // API key should be private
        });

        test('should return 401 if not authenticated', async () => {
            await request(app)
                .get('/api/v1/merchants')
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 403 if authenticated as normal user', async () => {
            await request(app)
                .get('/api/v1/merchants')
                .set('Authorization', `Bearer ${normalUserAccessToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should filter merchants by name and return 200', async () => {
            const merchantToFind = merchants[0];
            const res = await request(app)
                .get(`/api/v1/merchants?name=${merchantToFind.name}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(httpStatus.OK);

            expect(res.body.results).toHaveLength(1);
            expect(res.body.results[0].id).toBe(merchantToFind.id);
        });

        test('should paginate and limit results', async () => {
            const res = await request(app)
                .get('/api/v1/merchants?limit=1&page=1')
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(httpStatus.OK);

            expect(res.body.results).toHaveLength(1);
            expect(res.body.page).toBe(1);
            expect(res.body.limit).toBe(1);
            expect(res.body.totalResults).toBe(merchants.length);
        });
    });

    describe('GET /api/v1/merchants/:merchantId', () => {
        let merchant;

        beforeEach(async () => {
            merchant = await Merchant.create({
                id: faker.string.uuid(),
                name: 'Single Merchant',
                email: 'single@merchant.com',
                businessCategory: 'Retail',
                apiKey: `sk_test_${faker.string.uuid()}`,
                isActive: true,
            });
        });

        test('should return 200 and merchant object if authenticated as admin', async () => {
            const res = await request(app)
                .get(`/api/v1/merchants/${merchant.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(httpStatus.OK);

            expect(res.body.id).toBe(merchant.id);
            expect(res.body.name).toBe(merchant.name);
            expect(res.body).not.toHaveProperty('apiKey');
        });

        test('should return 404 if merchant not found', async () => {
            const nonExistentId = faker.string.uuid();
            await request(app)
                .get(`/api/v1/merchants/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(httpStatus.NOT_FOUND);
        });

        test('should return 401 if not authenticated', async () => {
            await request(app)
                .get(`/api/v1/merchants/${merchant.id}`)
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 403 if authenticated as normal user', async () => {
            await request(app)
                .get(`/api/v1/merchants/${merchant.id}`)
                .set('Authorization', `Bearer ${normalUserAccessToken}`)
                .expect(httpStatus.FORBIDDEN);
        });
    });

    describe('PATCH /api/v1/merchants/:merchantId', () => {
        let merchant;
        const updateData = {
            name: 'Updated Merchant Name',
            businessCategory: 'IT Services',
        };

        beforeEach(async () => {
            merchant = await Merchant.create({
                id: faker.string.uuid(),
                name: 'Original Merchant',
                email: 'original@merchant.com',
                businessCategory: 'Retail',
                apiKey: `sk_test_${faker.string.uuid()}`,
                isActive: true,
            });
        });

        test('should return 200 and update merchant if authenticated as admin', async () => {
            const res = await request(app)
                .patch(`/api/v1/merchants/${merchant.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send(updateData)
                .expect(httpStatus.OK);

            expect(res.body.id).toBe(merchant.id);
            expect(res.body.name).toBe(updateData.name);
            expect(res.body.businessCategory).toBe(updateData.businessCategory);

            const dbMerchant = await Merchant.findByPk(merchant.id);
            expect(dbMerchant.name).toBe(updateData.name);
            expect(dbMerchant.businessCategory).toBe(updateData.businessCategory);
        });

        test('should return 400 if email is updated to an existing email', async () => {
            await Merchant.create({
                id: faker.string.uuid(),
                name: 'Another Merchant',
                email: 'another@merchant.com',
                businessCategory: 'Food',
                apiKey: `sk_test_${faker.string.uuid()}`,
                isActive: true,
            });

            await request(app)
                .patch(`/api/v1/merchants/${merchant.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .send({ email: 'another@merchant.com' })
                .expect(httpStatus.BAD_REQUEST);
        });

        test('should return 401 if not authenticated', async () => {
            await request(app)
                .patch(`/api/v1/merchants/${merchant.id}`)
                .send(updateData)
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 403 if authenticated as normal user', async () => {
            await request(app)
                .patch(`/api/v1/merchants/${merchant.id}`)
                .set('Authorization', `Bearer ${normalUserAccessToken}`)
                .send(updateData)
                .expect(httpStatus.FORBIDDEN);
        });
    });

    describe('DELETE /api/v1/merchants/:merchantId', () => {
        let merchantToDelete;

        beforeEach(async () => {
            merchantToDelete = await Merchant.create({
                id: faker.string.uuid(),
                name: 'Delete Me',
                email: 'delete@me.com',
                businessCategory: 'Testing',
                apiKey: `sk_test_${faker.string.uuid()}`,
                isActive: true,
            });
        });

        test('should return 204 if merchant is deleted successfully by admin', async () => {
            await request(app)
                .delete(`/api/v1/merchants/${merchantToDelete.id}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(httpStatus.NO_CONTENT);

            const dbMerchant = await Merchant.findByPk(merchantToDelete.id);
            expect(dbMerchant).toBeNull();
        });

        test('should return 404 if merchant not found', async () => {
            const nonExistentId = faker.string.uuid();
            await request(app)
                .delete(`/api/v1/merchants/${nonExistentId}`)
                .set('Authorization', `Bearer ${adminAccessToken}`)
                .expect(httpStatus.NOT_FOUND);
        });

        test('should return 401 if not authenticated', async () => {
            await request(app)
                .delete(`/api/v1/merchants/${merchantToDelete.id}`)
                .expect(httpStatus.UNAUTHORIZED);
        });

        test('should return 403 if authenticated as normal user', async () => {
            await request(app)
                .delete(`/api/v1/merchants/${merchantToDelete.id}`)
                .set('Authorization', `Bearer ${normalUserAccessToken}`)
                .expect(httpStatus.FORBIDDEN);
        });
    });
});
```