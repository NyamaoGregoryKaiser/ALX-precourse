```javascript
const request = require('supertest');
const httpStatus = require('http-status');
const app = require('../../src/app');
const { User } = require('../../src/models');
const { generateAuthTokens } = require('../../src/utils/jwt');
const setupTestDB = require('../jest.setup');
const config = require('../../config/config');

setupTestDB();

describe('User Integration Tests', () => {
  let adminUser, regularUser;
  let adminAccessToken, regularAccessToken;

  beforeEach(async () => {
    // Clear users table and re-create initial seed data
    await User.destroy({ truncate: true, cascade: true }); // Clear all users first

    adminUser = await User.create({
      name: 'Admin Test',
      email: 'admin.test@example.com',
      password: 'AdminPassword1',
      role: 'admin',
    });
    regularUser = await User.create({
      name: 'Regular Test',
      email: 'regular.test@example.com',
      password: 'RegularPassword1',
      role: 'user',
    });

    adminAccessToken = generateAuthTokens(adminUser.id).access.token;
    regularAccessToken = generateAuthTokens(regularUser.id).access.token;
  });

  describe('User creation', () => {
    it('should allow admin to create a new user', async () => {
      const newUser = {
        name: 'New User',
        email: 'newuser@example.com',
        password: 'NewUserPassword1',
        role: 'user',
      };

      const res = await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(httpStatus.CREATED);

      expect(res.body).toHaveProperty('id');
      expect(res.body.name).toBe(newUser.name);
      expect(res.body.email).toBe(newUser.email);
      expect(res.body.role).toBe(newUser.role);
      expect(res.body).not.toHaveProperty('password'); // Password should not be returned

      const dbUser = await User.findByPk(res.body.id);
      expect(dbUser).toBeDefined();
      expect(dbUser.email).toBe(newUser.email);
      expect(await dbUser.isPasswordMatch(newUser.password)).toBe(true);
    });

    it('should not allow regular user to create a new user', async () => {
      const newUser = {
        name: 'Another User',
        email: 'anotheruser@example.com',
        password: 'AnotherUserPassword1',
        role: 'user',
      };

      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send(newUser)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 400 if email is already taken', async () => {
      const newUser = {
        name: 'Duplicate User',
        email: adminUser.email, // Use existing email
        password: 'DupPassword1',
        role: 'user',
      };

      await request(app)
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(newUser)
        .expect(httpStatus.BAD_REQUEST);
    });
  });

  describe('User retrieval', () => {
    it('should allow admin to get all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.results).toBeInstanceOf(Array);
      expect(res.body.results.length).toBeGreaterThanOrEqual(2); // admin and regular user
      expect(res.body.results[0]).not.toHaveProperty('password');
    });

    it('should not allow regular user to get all users', async () => {
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should allow admin to get a specific user', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.email).toBe(regularUser.email);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should allow a user to get their own profile', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.OK);

      expect(res.body.email).toBe(regularUser.email);
    });

    it('should not allow a user to get another user\'s profile', async () => {
      await request(app)
        .get(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 404 if user not found', async () => {
      await request(app)
        .get('/api/v1/users/99999') // Non-existent ID
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('User update', () => {
    it('should allow admin to update any user (including role)', async () => {
      const updateBody = {
        name: 'Updated Admin Name',
        role: 'user', // Admin changing role
      };

      const res = await request(app)
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.name).toBe(updateBody.name);
      expect(res.body.role).toBe(updateBody.role);

      const dbUser = await User.findByPk(adminUser.id);
      expect(dbUser.name).toBe(updateBody.name);
      expect(dbUser.role).toBe(updateBody.role);
    });

    it('should allow a regular user to update their own name/email/password', async () => {
      const updateBody = {
        name: 'Updated Regular User Name',
        email: 'newregular@example.com',
        password: 'NewRegularPassword1',
      };

      const res = await request(app)
        .patch(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.OK);

      expect(res.body.name).toBe(updateBody.name);
      expect(res.body.email).toBe(updateBody.email);
      expect(res.body).not.toHaveProperty('password');

      const dbUser = await User.findByPk(regularUser.id);
      expect(dbUser.name).toBe(updateBody.name);
      expect(dbUser.email).toBe(updateBody.email);
      expect(await dbUser.isPasswordMatch(updateBody.password)).toBe(true);
    });

    it('should not allow a regular user to update their own role', async () => {
      const updateBody = {
        role: 'admin',
      };

      await request(app)
        .patch(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should not allow a regular user to update another user', async () => {
      const updateBody = { name: 'Attempted Update' };

      await request(app)
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 400 if email is already taken during update', async () => {
      const updateBody = { email: regularUser.email }; // Try to update admin's email to regular user's email

      await request(app)
        .patch(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateBody)
        .expect(httpStatus.BAD_REQUEST);
    });

    it('should return 404 if user not found for update', async () => {
      await request(app)
        .patch('/api/v1/users/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ name: 'Non Existent' })
        .expect(httpStatus.NOT_FOUND);
    });
  });

  describe('User deletion', () => {
    it('should allow admin to delete a user', async () => {
      await request(app)
        .delete(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NO_CONTENT);

      const dbUser = await User.findByPk(regularUser.id);
      expect(dbUser).toBeNull();
    });

    it('should not allow a regular user to delete a user', async () => {
      await request(app)
        .delete(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularAccessToken}`)
        .expect(httpStatus.FORBIDDEN);
    });

    it('should return 404 if user not found for deletion', async () => {
      await request(app)
        .delete('/api/v1/users/99999')
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .expect(httpStatus.NOT_FOUND);
    });
  });
});
```