```javascript
const request = require('supertest');
const app = require('../../src/app');
const { prisma } = require('../../src/config/db');
const { clearDatabase, createTestUser } = require('../fixtures/authFixtures');
const { signToken } = require('../../src/utils/jwt');
const config = require('../../src/config');
const bcrypt = require('bcryptjs');

// Helper to get JWT token directly
const getAuthToken = (userId) => {
  return signToken(userId);
};

describe('User Controller Integration Tests', () => {
  let adminUser, regularUser, adminToken, regularToken;

  beforeAll(async () => {
    await clearDatabase(); // Ensure a clean slate before all tests
    adminUser = await createTestUser({ email: 'admin@test.com', username: 'admin', role: 'ADMIN' });
    regularUser = await createTestUser({ email: 'user@test.com', username: 'regularuser', role: 'USER' });

    adminToken = getAuthToken(adminUser.id);
    regularToken = getAuthToken(regularUser.id);
  });

  afterAll(async () => {
    await clearDatabase();
    await prisma.$disconnect();
  });

  // Self-management routes
  describe('GET /api/v1/users/me', () => {
    it('should return 200 and the current user profile for authenticated user', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.user.id).toEqual(regularUser.id);
      expect(res.body.data.user.email).toEqual(regularUser.email);
      expect(res.body.data.user.username).toEqual(regularUser.username);
      expect(res.body.data.user).not.toHaveProperty('password');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('You are not logged in! Please log in to get access.');
    });
  });

  describe('PATCH /api/v1/users/update-me', () => {
    it('should return 200 and update the current user profile', async () => {
      const newUsername = 'updatedusername';
      const newEmail = 'updated@test.com';

      const res = await request(app)
        .patch('/api/v1/users/update-me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ username: newUsername, email: newEmail });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.data.user.username).toEqual(newUsername);
      expect(res.body.data.user.email).toEqual(newEmail);

      // Verify in DB
      const userInDb = await prisma.user.findUnique({ where: { id: regularUser.id } });
      expect(userInDb.username).toEqual(newUsername);
      expect(userInDb.email).toEqual(newEmail);

      // Update regularUser object for subsequent tests
      regularUser.username = newUsername;
      regularUser.email = newEmail;
    });

    it('should return 400 if no valid fields are provided', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ invalidField: 'test' }); // Only invalid field

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('No valid fields provided for update.');
    });

    it('should return 409 if new email is already taken by another user', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ email: adminUser.email });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toEqual('Email already registered.');
    });

    it('should return 409 if new username is already taken by another user', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ username: adminUser.username });

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toEqual('Username already taken.');
    });

    it('should return 403 if trying to update role', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-me')
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ role: 'ADMIN' }); // Attempt to update role

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toEqual('Cannot update user role via this endpoint.');
    });
  });

  describe('PATCH /api/v1/users/update-password', () => {
    let tempUser, tempToken;
    beforeEach(async () => {
      tempUser = await createTestUser({ username: 'tempuser', email: 'temp@test.com', password: 'OldPassword123!' });
      tempToken = getAuthToken(tempUser.id);
    });

    it('should return 200 and update the current user password', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ currentPassword: 'OldPassword123!', newPassword: 'NewPassword456!' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('success');
      expect(res.body.message).toEqual('Password updated successfully.');

      // Verify in DB
      const userInDb = await prisma.user.findUnique({ where: { id: tempUser.id } });
      const isPasswordCorrect = await bcrypt.compare('NewPassword456!', userInDb.password);
      expect(isPasswordCorrect).toBe(true);
    });

    it('should return 401 if current password is incorrect', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword456!' });

      expect(res.statusCode).toEqual(401);
      expect(res.body.message).toEqual('Current password is incorrect.');
    });

    it('should return 400 if new password is same as current', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ currentPassword: 'OldPassword123!', newPassword: 'OldPassword123!' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toEqual('New password cannot be the same as the current password.');
    });

    it('should return 400 for invalid new password format (Joi validation)', async () => {
      const res = await request(app)
        .patch('/api/v1/users/update-password')
        .set('Authorization', `Bearer ${tempToken}`)
        .send({ currentPassword: 'OldPassword123!', newPassword: 'short' }); // Less than 8 chars

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toContain('"newPassword" length must be at least 8 characters long');
    });
  });

  describe('DELETE /api/v1/users/deactivate-me', () => {
    let userToDelete, userToDeleteToken;
    beforeEach(async () => {
      userToDelete = await createTestUser({ email: 'delete@test.com', username: 'todelete' });
      userToDeleteToken = getAuthToken(userToDelete.id);
    });

    it('should return 204 and deactivate the current user account', async () => {
      const res = await request(app)
        .delete('/api/v1/users/deactivate-me')
        .set('Authorization', `Bearer ${userToDeleteToken}`);

      expect(res.statusCode).toEqual(204);
      expect(res.body).toEqual({}); // 204 No Content

      // Verify in DB that user is deleted
      const userInDb = await prisma.user.findUnique({ where: { id: userToDelete.id } });
      expect(userInDb).toBeNull();
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).delete('/api/v1/users/deactivate-me');
      expect(res.statusCode).toEqual(401);
    });
  });

  // Admin-only routes
  describe('Admin User Management', () => {
    let testUser1, testUser2;
    beforeAll(async () => {
      testUser1 = await createTestUser({ username: 'userone', email: 'user1@test.com' });
      testUser2 = await createTestUser({ username: 'usertwo', email: 'user2@test.com' });
    });

    describe('GET /api/v1/users', () => {
      it('should return 200 and all users for admin', async () => {
        const res = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('success');
        expect(res.body.data.users.length).toBeGreaterThanOrEqual(3); // admin, regular, user1, user2
        expect(res.body.data.users.some(u => u.id === adminUser.id)).toBe(true);
        expect(res.body.data.users.some(u => u.id === regularUser.id)).toBe(true);
        expect(res.body.data.users.some(u => u.id === testUser1.id)).toBe(true);
      });

      it('should return 403 for non-admin user', async () => {
        const res = await request(app)
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${regularToken}`);

        expect(res.statusCode).toEqual(403);
        expect(res.body.message).toEqual('You do not have permission to perform this action.');
      });

      it('should filter users by email', async () => {
        const res = await request(app)
          .get(`/api/v1/users?email=${testUser1.email}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.users).toHaveLength(1);
        expect(res.body.data.users[0].email).toEqual(testUser1.email);
      });

      it('should paginate users', async () => {
        const res = await request(app)
          .get('/api/v1/users?page=1&limit=2')
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.data.users).toHaveLength(2);
        expect(res.body.total).toBeGreaterThanOrEqual(3); // Total count check
      });
    });

    describe('GET /api/v1/users/:id', () => {
      it('should return 200 and a specific user for admin', async () => {
        const res = await request(app)
          .get(`/api/v1/users/${testUser1.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('success');
        expect(res.body.data.user.id).toEqual(testUser1.id);
      });

      it('should return 404 if user not found for admin', async () => {
        const res = await request(app)
          .get(`/api/v1/users/a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(404);
        expect(res.body.message).toEqual('User not found.');
      });
    });

    describe('PATCH /api/v1/users/:id/role', () => {
      it('should return 200 and update user role for admin', async () => {
        const res = await request(app)
          .patch(`/api/v1/users/${testUser2.id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'ADMIN' });

        expect(res.statusCode).toEqual(200);
        expect(res.body.status).toEqual('success');
        expect(res.body.data.user.id).toEqual(testUser2.id);
        expect(res.body.data.user.role).toEqual('ADMIN');

        // Verify in DB
        const userInDb = await prisma.user.findUnique({ where: { id: testUser2.id } });
        expect(userInDb.role).toEqual('ADMIN');
      });

      it('should return 400 for invalid role', async () => {
        const res = await request(app)
          .patch(`/api/v1/users/${testUser1.id}/role`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ role: 'SUPERUSER' });

        expect(res.statusCode).toEqual(400);
        expect(res.body.message).toContain('"role" must be one of [USER, ADMIN]');
      });
    });

    describe('DELETE /api/v1/users/:id', () => {
      it('should return 204 and delete a user for admin', async () => {
        const userToDeleteAdmin = await createTestUser({ email: 'admindelete@test.com', username: 'admindelete' });

        const res = await request(app)
          .delete(`/api/v1/users/${userToDeleteAdmin.id}`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(204);
        expect(res.body).toEqual({});

        // Verify in DB
        const userInDb = await prisma.user.findUnique({ where: { id: userToDeleteAdmin.id } });
        expect(userInDb).toBeNull();
      });

      it('should return 404 if user not found for admin', async () => {
        const res = await request(app)
          .delete(`/api/v1/users/b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2`)
          .set('Authorization', `Bearer ${adminToken}`);

        expect(res.statusCode).toEqual(404);
        expect(res.body.message).toEqual('User not found.');
      });
    });
  });
});
```