```javascript
const request = require('supertest');
const app = require('../../app');
const { sequelize, User } = require('../../db/models');
const cache = require('../../utils/cache');
const bcrypt = require('bcryptjs');
const authService = require('../../services/authService');

describe('User API Tests (Admin Protected)', () => {
  let adminUser, regularUser;
  let adminAccessToken, regularAccessToken;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    await cache.client.flushdb();

    // Create admin user
    adminUser = await User.create({
      username: 'adminapi',
      email: 'adminapi@example.com',
      password: 'adminpassword',
      role: 'admin',
    });
    const adminLogin = await authService.loginUser(adminUser.email, 'adminpassword');
    adminAccessToken = adminLogin.accessToken;

    // Create regular user
    regularUser = await User.create({
      username: 'userapi',
      email: 'userapi@example.com',
      password: 'userpassword',
      role: 'user',
    });
    const regularLogin = await authService.loginUser(regularUser.email, 'userpassword');
    regularAccessToken = regularLogin.accessToken;
  });

  afterAll(async () => {
    // Database connection closure handled by tests/setup.test.js
  });

  describe('GET /api/v1/users', () => {
    it('should allow admin to get all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.results).toBeGreaterThanOrEqual(2);
      expect(res.body.data.users.some(u => u.email === adminUser.email)).toBe(true);
      expect(res.body.data.users.some(u => u.email === regularUser.email)).toBe(true);
      expect(res.body.data.users[0]).not.toHaveProperty('password');
    });

    it('should return 403 for non-admin user trying to get all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${regularAccessToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You do not have permission to perform this action');
    });

    it('should return 401 if no access token provided', async () => {
      const res = await request(app)
        .get('/api/v1/users');

      expect(res.statusCode).toEqual(401);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You are not logged in! Please log in to get access.');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should allow admin to get a user by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.id).toBe(regularUser.id);
      expect(res.body.data.user.email).toBe(regularUser.email);
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 404 if user not found', async () => {
      const res = await request(app)
        .get('/api/v1/users/a0000000-0000-0000-0000-000000000000') // Non-existent UUID
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User not found');
    });

    it('should return 403 for non-admin user trying to get a user by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You do not have permission to perform this action');
    });
  });

  describe('POST /api/v1/users', () => {
    it('should allow admin to create a new user', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({
          username: 'createdbyadmin',
          email: 'created@example.com',
          password: 'newpassword',
          role: 'user',
        });

      expect(res.statusCode).toEqual(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.email).toBe('created@example.com');
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 403 for non-admin user trying to create a user', async () => {
      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({
          username: 'trytoadmin',
          email: 'trytoadmin@example.com',
          password: 'password123',
          role: 'user',
        });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You do not have permission to perform this action');
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    let userToUpdate;
    beforeEach(async () => {
      userToUpdate = await User.create({
        username: 'updateme',
        email: 'updateme@example.com',
        password: 'password',
        role: 'user',
      });
    });

    it('should allow admin to update an existing user', async () => {
      const res = await request(app)
        .put(`/api/v1/users/${userToUpdate.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ username: 'updated_user_admin' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user.username).toBe('updated_user_admin');
      expect(res.body.data.user.id).toBe(userToUpdate.id);
    });

    it('should return 404 if user to update is not found', async () => {
      const res = await request(app)
        .put('/api/v1/users/a0000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ username: 'nonexistent' });

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User not found');
    });

    it('should return 403 for non-admin user trying to update a user', async () => {
      const res = await request(app)
        .put(`/api/v1/users/${userToUpdate.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send({ username: 'updatedbyuser' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You do not have permission to perform this action');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    let userToDelete;
    beforeEach(async () => {
      userToDelete = await User.create({
        username: 'deleteme',
        email: 'deleteme@example.com',
        password: 'password',
        role: 'user',
      });
    });

    it('should allow admin to delete a user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(204);
      expect(res.body).toEqual({}); // No content for 204

      const foundUser = await User.findByPk(userToDelete.id);
      expect(foundUser).toBeNull();
    });

    it('should return 404 if user to delete is not found', async () => {
      const res = await request(app)
        .delete('/api/v1/users/a0000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('User not found');
    });

    it('should return 403 for non-admin user trying to delete a user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.status).toBe('fail');
      expect(res.body.message).toBe('You do not have permission to perform this action');
    });
  });
});
```