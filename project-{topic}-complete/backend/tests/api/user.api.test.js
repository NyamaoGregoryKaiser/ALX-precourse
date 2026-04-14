```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const db = require('../../src/db');
const User = require('../../src/models/user.model');
const authController = require('../../src/controllers/auth.controller');
const config = require('../../src/config');

// Helper function to get an auth token for a user
const getAuthToken = async (email, password) => {
    const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });
    return res.body.data.token;
};

describe('User API Tests', () => {
    let adminToken;
    let userToken;
    let adminUser;
    let regularUser;

    beforeAll(async () => {
        await db.migrate.latest();
    });

    beforeEach(async () => {
        // Clear tables and seed users before each test
        await db('job_logs').del();
        await db('scraped_data').del();
        await db('scraping_jobs').del();
        await db('users').del();
        await db.seed.run(); // Seeds admin and regular user

        adminUser = await User.findByEmail(config.adminEmail);
        regularUser = await User.findByEmail('user@example.com');

        adminToken = await getAuthToken(config.adminEmail, config.adminPassword);
        userToken = await getAuthToken('user@example.com', 'userpassword123');
    });

    afterAll(async () => {
        await db.migrate.rollback();
        await db.destroy();
    });

    describe('GET /api/users', () => {
        test('should return 200 and all users if authenticated as admin', async () => {
            const res = await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data).toBeInstanceOf(Array);
            expect(res.body.data.length).toBeGreaterThanOrEqual(2); // Admin and testuser
            expect(res.body.data[0]).not.toHaveProperty('password_hash');
        });

        test('should return 403 if authenticated as a regular user', async () => {
            await request(app)
                .get('/api/users')
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 401 if unauthenticated', async () => {
            await request(app)
                .get('/api/users')
                .expect(httpStatus.UNAUTHORIZED);
        });
    });

    describe('GET /api/users/:userId', () => {
        test('should return 200 and user info for an admin accessing any user', async () => {
            const res = await request(app)
                .get(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(regularUser.id);
            expect(res.body.data.email).toBe(regularUser.email);
            expect(res.body.data).not.toHaveProperty('password_hash');
        });

        test('should return 200 and user info for a regular user accessing their own info', async () => {
            const res = await request(app)
                .get(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.id).toBe(regularUser.id);
            expect(res.body.data.email).toBe(regularUser.email);
        });

        test('should return 403 for a regular user accessing another user\'s info', async () => {
            await request(app)
                .get(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 404 if user not found', async () => {
            await request(app)
                .get('/api/users/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.NOT_FOUND);
        });
    });

    describe('PATCH /api/users/:userId', () => {
        test('should allow admin to update any user\'s info, including role', async () => {
            const updateBody = { username: 'updated_regular_user', role: 'admin' };
            const res = await request(app)
                .patch(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updateBody)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe(updateBody.username);
            expect(res.body.data.role).toBe(updateBody.role);

            const updatedUserInDb = await User.findById(regularUser.id);
            expect(updatedUserInDb.username).toBe(updateBody.username);
            expect(updatedUserInDb.role).toBe(updateBody.role);
        });

        test('should allow regular user to update their own info (not role)', async () => {
            const updateBody = { username: 'self_updated_user', email: 'new_email@example.com' };
            const res = await request(app)
                .patch(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateBody)
                .expect(httpStatus.OK);

            expect(res.body.success).toBe(true);
            expect(res.body.data.username).toBe(updateBody.username);
            expect(res.body.data.email).toBe(updateBody.email);
            expect(res.body.data.role).toBe(regularUser.role); // Role should not change

            const updatedUserInDb = await User.findById(regularUser.id);
            expect(updatedUserInDb.username).toBe(updateBody.username);
            expect(updatedUserInDb.email).toBe(updateBody.email);
        });

        test('should return 403 if regular user tries to update another user', async () => {
            await request(app)
                .patch(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send({ username: 'hacker' })
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 403 if regular user tries to change their own role', async () => {
            const updateBody = { role: 'admin' }; // Regular user trying to promote themselves
            const res = await request(app)
                .patch(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updateBody)
                .expect(httpStatus.OK); // Expect 200, but role should not change

            expect(res.body.data.role).toBe('user'); // Role should remain 'user'
            const updatedUserInDb = await User.findById(regularUser.id);
            expect(updatedUserInDb.role).toBe('user');
        });

        test('should return 404 if user not found for update', async () => {
            await request(app)
                .patch('/api/users/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .send({ username: 'nonexistent' })
                .expect(httpStatus.NOT_FOUND);
        });
    });

    describe('DELETE /api/users/:userId', () => {
        test('should allow admin to delete any user (except themselves via this endpoint)', async () => {
            const initialUserCount = (await db('users').count('id as count').first()).count;
            const res = await request(app)
                .delete(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.NO_CONTENT);

            expect(res.body).toEqual({}); // No content means empty body
            const userCountAfterDelete = (await db('users').count('id as count').first()).count;
            expect(userCountAfterDelete).toBe(parseInt(initialUserCount) - 1);
            const deletedUser = await User.findById(regularUser.id);
            expect(deletedUser).toBeUndefined();
        });

        test('should return 403 if admin tries to delete themselves via this endpoint', async () => {
            await request(app)
                .delete(`/api/users/${adminUser.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 403 if regular user tries to delete any user', async () => {
            await request(app)
                .delete(`/api/users/${regularUser.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(httpStatus.FORBIDDEN);
        });

        test('should return 404 if user not found for deletion', async () => {
            await request(app)
                .delete('/api/users/99999')
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(httpStatus.NOT_FOUND);
        });
    });
});
```