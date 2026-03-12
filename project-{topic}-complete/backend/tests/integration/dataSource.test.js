const request = require('supertest');
const app = require('../../src/app');
const { sequelize } = require('../../src/config/database');
const User = require('../../src/models/user.model');
const DataSource = require('../../src/models/dataSource.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

let testUser;
let adminUser;
let authToken;
let adminAuthToken;

beforeAll(async () => {
    // Ensure DB is clear for tests
    await sequelize.sync({ force: true });

    // Create a test user
    const hashedPassword = await bcrypt.hash('testpass', 10);
    testUser = await User.create({
        id: uuidv4(),
        username: 'testuser_ds',
        email: 'test_ds@example.com',
        password: hashedPassword,
        role: 'user'
    });
    authToken = jwt.sign({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        role: testUser.role
    }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });

    // Create an admin user
    adminUser = await User.create({
        id: uuidv4(),
        username: 'admin_ds',
        email: 'admin_ds@example.com',
        password: hashedPassword,
        role: 'admin'
    });
    adminAuthToken = jwt.sign({
        id: adminUser.id,
        username: adminUser.username,
        email: adminUser.email,
        role: adminUser.role
    }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });
});

afterAll(async () => {
    await sequelize.close();
});

describe('Data Source API', () => {
    let newDataSourceId;

    it('should allow a user to create a new data source', async () => {
        const res = await request(app)
            .post('/api/data-sources')
            .set('Cookie', [`token=${authToken}`])
            .send({
                name: 'My Test Data Source',
                type: 'json_data',
                config: { description: 'Some test data' },
                schema: [{ name: 'column1', type: 'string' }, { name: 'column2', type: 'number' }],
                data: [{ column1: 'A', column2: 10 }, { column1: 'B', column2: 20 }]
            });

        expect(res.statusCode).toEqual(201);
        expect(res.body).toHaveProperty('id');
        expect(res.body.name).toEqual('My Test Data Source');
        expect(res.body.userId).toEqual(testUser.id);
        newDataSourceId = res.body.id;
    });

    it('should return 400 if required fields are missing during creation', async () => {
        const res = await request(app)
            .post('/api/data-sources')
            .set('Cookie', [`token=${authToken}`])
            .send({
                name: 'Incomplete Data Source',
                type: 'json_data',
                // Missing config and schema
            });
        expect(res.statusCode).toEqual(400);
        expect(res.body).toHaveProperty('message', 'Name, type, config, and schema are required.');
    });

    it('should retrieve all data sources for the authenticated user', async () => {
        const res = await request(app)
            .get('/api/data-sources')
            .set('Cookie', [`token=${authToken}`]);

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
        expect(res.body[0].userId).toEqual(testUser.id);
    });

    it('should retrieve a single data source by ID', async () => {
        const res = await request(app)
            .get(`/api/data-sources/${newDataSourceId}`)
            .set('Cookie', [`token=${authToken}`]);

        expect(res.statusCode).toEqual(200);
        expect(res.body.id).toEqual(newDataSourceId);
        expect(res.body.name).toEqual('My Test Data Source');
    });

    it('should return 404 for a non-existent data source', async () => {
        const nonExistentId = uuidv4();
        const res = await request(app)
            .get(`/api/data-sources/${nonExistentId}`)
            .set('Cookie', [`token=${authToken}`]);
        expect(res.statusCode).toEqual(404);
        expect(res.body).toHaveProperty('message', 'Data source not found or unauthorized');
    });

    it('should allow updating an existing data source', async () => {
        const updatedName = 'Updated Test Data Source';
        const res = await request(app)
            .put(`/api/data-sources/${newDataSourceId}`)
            .set('Cookie', [`token=${authToken}`])
            .send({ name: updatedName });

        expect(res.statusCode).toEqual(200);
        expect(res.body.name).toEqual(updatedName);
    });

    it('should prevent one user from updating another user\'s data source', async () => {
        // Create another user and try to update testUser's data source
        const otherUserHashedPassword = await bcrypt.hash('otherpass', 10);
        const otherUser = await User.create({
            id: uuidv4(),
            username: 'otheruser_ds',
            email: 'other_ds@example.com',
            password: otherUserHashedPassword,
            role: 'user'
        });
        const otherUserAuthToken = jwt.sign({
            id: otherUser.id,
            username: otherUser.username,
            email: otherUser.email,
            role: otherUser.role
        }, process.env.JWT_SECRET || 'testsecret', { expiresIn: '1h' });

        const res = await request(app)
            .put(`/api/data-sources/${newDataSourceId}`)
            .set('Cookie', [`token=${otherUserAuthToken}`])
            .send({ name: 'Malicious Update' });

        expect(res.statusCode).toEqual(404); // Should be 404 (not found for that user)
    });

    it('should allow retrieving processed data for a data source', async () => {
        const res = await request(app)
            .post(`/api/data-sources/${newDataSourceId}/process`)
            .set('Cookie', [`token=${authToken}`])
            .send({
                filters: [{ field: 'column2', operator: 'gte', value: 15 }]
            });

        expect(res.statusCode).toEqual(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBe(1); // Only { column1: 'B', column2: 20 } should remain
        expect(res.body[0]).toEqual({ column1: 'B', column2: 20 });
    });

    it('should allow deleting an existing data source', async () => {
        const res = await request(app)
            .delete(`/api/data-sources/${newDataSourceId}`)
            .set('Cookie', [`token=${authToken}`]);

        expect(res.statusCode).toEqual(204); // No content
        // Verify it's actually deleted
        const checkRes = await request(app)
            .get(`/api/data-sources/${newDataSourceId}`)
            .set('Cookie', [`token=${authToken}`]);
        expect(checkRes.statusCode).toEqual(404);
    });

    it('should return 401 if no token is provided for protected routes', async () => {
        const res = await request(app).get('/api/data-sources');
        expect(res.statusCode).toEqual(401);
    });
});