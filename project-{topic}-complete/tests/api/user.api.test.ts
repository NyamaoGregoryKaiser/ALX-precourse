import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/database/data-source';
import { User, UserRole } from '../../src/database/entities/User.entity';
import { generateToken } from '../../src/utils/jwt';

describe('User API Tests', () => {
  const userRepository = AppDataSource.getRepository(User);
  let userToken: string;
  let adminToken: string;
  let regularUser: User;
  let adminUser: User;

  beforeEach(async () => {
    // Create a regular user
    regularUser = userRepository.create({
      firstName: 'Test',
      lastName: 'User',
      email: 'testuser@example.com',
      password: 'password123',
      role: UserRole.USER,
    });
    await regularUser.hashPassword();
    await userRepository.save(regularUser);
    userToken = generateToken({ id: regularUser.id, email: regularUser.email, role: regularUser.role });

    // Create an admin user
    adminUser = userRepository.create({
      firstName: 'Admin',
      lastName: 'User',
      email: 'adminuser@example.com',
      password: 'adminpassword123',
      role: UserRole.ADMIN,
    });
    await adminUser.hashPassword();
    await userRepository.save(adminUser);
    adminToken = generateToken({ id: adminUser.id, email: adminUser.email, role: adminUser.role });
  });

  describe('GET /api/v1/users/me', () => {
    it('should return the authenticated user\'s profile', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${userToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', regularUser.id);
      expect(res.body).toHaveProperty('email', regularUser.email);
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .expect(401);

      expect(res.body.message).toBe('Authentication token missing or malformed.');
    });

    it('should return 401 if an invalid token is provided', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalidtoken')
        .expect(401);

      expect(res.body.message).toBe('Invalid authentication token.');
    });
  });

  describe('GET /api/v1/users/:id (Admin Only)', () => {
    it('should allow admin to get any user by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', regularUser.id);
      expect(res.body).toHaveProperty('email', regularUser.email);
    });

    it('should prevent regular user from getting another user by ID', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      expect(res.body.message).toBe('Forbidden: You do not have permission to access this resource.');
    });

    it('should return 404 if user not found (admin)', async () => {
      const nonExistentId = '11111111-2222-3333-4444-555555555555';
      const res = await request(app)
        .get(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.message).toBe(`User with ID ${nonExistentId} not found.`);
    });
  });

  describe('PUT /api/v1/users/:id (Admin or Self)', () => {
    it('should allow a user to update their own profile', async () => {
      const updateData = { firstName: 'Updated', lastName: 'Name' };
      const res = await request(app)
        .put(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('firstName', updateData.firstName);
      expect(res.body).toHaveProperty('lastName', updateData.lastName);
      expect(res.body).toHaveProperty('email', regularUser.email); // Email shouldn't change
    });

    it('should allow an admin to update any user\'s profile', async () => {
      const updateData = { firstName: 'AdminUpdated' };
      const res = await request(app)
        .put(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData)
        .expect(200);

      expect(res.body).toHaveProperty('firstName', updateData.firstName);
      expect(res.body).toHaveProperty('id', regularUser.id);
    });

    it('should prevent a user from updating another user\'s profile', async () => {
      const updateData = { firstName: 'Attempted Update' };
      const res = await request(app)
        .put(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .send(updateData)
        .expect(403);

      expect(res.body.message).toBe('Forbidden: You do not have permission to update this user.');
    });

    it('should return 404 if user not found for update', async () => {
      const nonExistentId = '11111111-2222-3333-4444-555555555555';
      const updateData = { firstName: 'Non Existent' };
      const res = await request(app)
        .put(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`) // Admin trying to update non-existent user
        .send(updateData)
        .expect(404);

      expect(res.body.message).toBe(`User with ID ${nonExistentId} not found.`);
    });
  });

  describe('DELETE /api/v1/users/:id (Admin Only)', () => {
    it('should allow an admin to delete any user', async () => {
      await request(app)
        .delete(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(204);

      const deletedUser = await userRepository.findOneBy({ id: regularUser.id });
      expect(deletedUser).toBeNull();
    });

    it('should prevent a regular user from deleting any user', async () => {
      await request(app)
        .delete(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);

      const userInDb = await userRepository.findOneBy({ id: adminUser.id });
      expect(userInDb).not.toBeNull(); // User should still exist
    });

    it('should return 404 if user not found for deletion', async () => {
      const nonExistentId = '11111111-2222-3333-4444-555555555555';
      const res = await request(app)
        .delete(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body.message).toBe(`User with ID ${nonExistentId} not found.`);
    });
  });
});