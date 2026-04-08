const request = require('supertest');
const app = require('../../src/app');
const sequelize = require('../../src/config/database');
const User = require('../../src/models/User')(sequelize, require('sequelize'));
const authService = require('../../src/services/authService');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../src/config/jwt');

describe('User API (Admin Only) Tests', () => {
  let adminToken, regularUserToken;
  let adminUser, regularUser, anotherRegularUser;

  beforeAll(async () => {
    // Clear database and seed test users
    await User.destroy({ truncate: true, cascade: true });

    adminUser = await authService.registerUser('admin', 'admin@test.com', 'password123', 'admin');
    const adminLogin = await authService.loginUser('admin@test.com', 'password123');
    adminToken = adminLogin.token;

    regularUser = await authService.registerUser('user', 'user@test.com', 'password123', 'user');
    const userLogin = await authService.loginUser('user@test.com', 'password123');
    regularUserToken = userLogin.token;

    anotherRegularUser = await authService.registerUser('anotheruser', 'another@test.com', 'password123', 'user');
  });

  afterEach(async () => {
    // No specific cleanup needed per test, as users are set up once
  });

  describe('Authentication and Authorization Middleware', () => {
    it('should return 401 for /users if no token is provided', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Authentication required');
    });

    it('should return 401 for /users if invalid token is provided', async () => {
      const res = await request(app).get('/api/v1/users').set('Authorization', 'Bearer invalidtoken');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Invalid token');
    });

    it('should return 401 for /users if expired token is provided', async () => {
      const expiredToken = jwt.sign({ id: adminUser.id, role: adminUser.role }, jwtConfig.secret, { expiresIn: '1ms' });
      await new Promise(resolve => setTimeout(resolve, 5)); // Wait for token to expire
      const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${expiredToken}`);
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Token expired');
    });

    it('should return 403 for /users if authenticated but not admin', async () => {
      const res = await request(app).get('/api/v1/users').set('Authorization', `Bearer ${regularUserToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Access forbidden');
    });
  });

  describe('GET /api/v1/users (Admin Only)', () => {
    it('should return all users for an admin user', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.users).toBeInstanceOf(Array);
      expect(res.body.users.length).toEqual(3); // admin, regular, anotherregular
      expect(res.body.users.map(u => u.email)).toEqual(expect.arrayContaining(['admin@test.com', 'user@test.com', 'another@test.com']));
      expect(res.body.users[0]).not.toHaveProperty('password'); // Ensure password is not returned
    });

    it('should return users with custom pagination', async () => {
      const res = await request(app)
        .get('/api/v1/users?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.users.length).toEqual(2);
      expect(res.body.total).toEqual(3);
      expect(res.body.page).toEqual(1);
      expect(res.body.limit).toEqual(2);
    });
  });

  describe('GET /api/v1/users/:id (Admin Only)', () => {
    it('should return a user by ID for an admin', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.id).toEqual(regularUser.id);
      expect(res.body.email).toEqual(regularUser.email);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 404 if user not found', async () => {
      const res = await request(app)
        .get('/api/v1/users/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toEqual('User with ID 9999 not found');
    });

    it('should return 400 for invalid ID', async () => {
      const res = await request(app)
        .get('/api/v1/users/abc')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation Error');
    });
  });

  describe('PUT /api/v1/users/:id (Admin Only)', () => {
    it('should allow an admin to update another user', async () => {
      const updatedData = { username: 'updated_user_name', role: 'admin' };
      const res = await request(app)
        .put(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.username).toEqual(updatedData.username);
      expect(res.body.role).toEqual(updatedData.role);
    });

    it('should return 404 if user to update is not found', async () => {
      const updatedData = { username: 'nonexistent' };
      const res = await request(app)
        .put('/api/v1/users/9999')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updatedData);

      expect(res.statusCode).toEqual(404);
    });

    it('should return 400 for invalid update data', async () => {
      const invalidData = { email: 'invalid-email', username: 'a' }; // Invalid email and too short username
      const res = await request(app)
        .put(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('Validation Error');
    });
  });

  describe('DELETE /api/v1/users/:id (Admin Only)', () => {
    let userToDelete;
    beforeEach(async () => {
      userToDelete = await authService.registerUser('todelete', 'todelete@test.com', 'password123', 'user');
    });

    it('should allow an admin to delete another user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(204);
      const deletedUser = await User.findByPk(userToDelete.id);
      expect(deletedUser).toBeNull();
    });

    it('should return 404 if user to delete is not found', async () => {
      const res = await request(app)
        .delete('/api/v1/users/9999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
    });

    it('should return 403 if admin tries to delete their own account', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Admin cannot delete their own account via this endpoint.');
    });
  });
});
```