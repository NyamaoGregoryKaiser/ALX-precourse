```typescript
import request from 'supertest';
import { AppDataSource } from '../../src/config/database';
import { initializeDataSource } from '../../src/data-source';
import app from '../../src/app';
import { User } from '../../src/entities/User';
import { Role, UserRole } from '../../src/entities/Role';
import { hashPassword } from '../../src/utils/password';
import { generateAuthTokens } from '../../src/utils/jwt';
import { connectRedis, closeRedis, getRedisClient } from '../../src/config/redis';

describe('User Endpoints Integration Tests', () => {
  let userRepository: any;
  let roleRepository: any;
  let server: any;

  let adminUser: User;
  let normalUser: User;
  let adminAccessToken: string;
  let normalUserAccessToken: string;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = 'test_jwt_secret';
    process.env.DB_NAME = 'test_user_db'; // Use a different test database

    await initializeDataSource();
    await connectRedis();

    userRepository = AppDataSource.getRepository(User);
    roleRepository = AppDataSource.getRepository(Role);

    server = app.listen(5002); // Start app on a different port for tests

    await AppDataSource.dropDatabase();
    await AppDataSource.synchronize();

    const adminRole = await roleRepository.save(roleRepository.create({ name: UserRole.ADMIN }));
    const userRole = await roleRepository.save(roleRepository.create({ name: UserRole.USER }));

    adminUser = userRepository.create({
      firstName: 'Admin', lastName: 'User', email: 'admin@test.com',
      password: await hashPassword('AdminPassword123!'), isEmailVerified: true, role: adminRole,
    });
    await userRepository.save(adminUser);
    adminAccessToken = (generateAuthTokens(adminUser.id, adminRole.name)).accessToken;

    normalUser = userRepository.create({
      firstName: 'Normal', lastName: 'User', email: 'user@test.com',
      password: await hashPassword('UserPassword123!'), isEmailVerified: true, role: userRole,
    });
    await userRepository.save(normalUser);
    normalUserAccessToken = (generateAuthTokens(normalUser.id, userRole.name)).accessToken;
  });

  beforeEach(async () => {
    // No need to clear users as they are set up once for multiple tests.
    // If tests modify users, consider resetting specific user states or creating fresh users.
    await getRedisClient().flushall(); // Clear Redis cache
  });

  afterAll(async () => {
    await server.close();
    await AppDataSource.dropDatabase();
    await AppDataSource.destroy();
    await closeRedis();
  });

  // --- GET /api/v1/users --- (Admin only)
  describe('GET /api/v1/users', () => {
    it('should allow admin to get all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].email).toBe('admin@test.com');
      expect(res.body[1].email).toBe('user@test.com');
      expect(res.body[0]).not.toHaveProperty('password');
    });

    it('should return 403 for normal user trying to get all users', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${normalUserAccessToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to access this resource.');
    });

    it('should return 401 for unauthenticated user trying to get all users', async () => {
      const res = await request(app).get('/api/v1/users');
      expect(res.statusCode).toEqual(401);
    });
  });

  // --- GET /api/v1/users/:userId ---
  describe('GET /api/v1/users/:userId', () => {
    it('should allow a user to get their own profile', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.email).toBe(normalUser.email);
      expect(res.body).not.toHaveProperty('password');
      expect(res.body.id).toBe(normalUser.id);
    });

    it('should allow admin to get any user profile', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.email).toBe(normalUser.email);
      expect(res.body.id).toBe(normalUser.id);
    });

    it('should return 403 if a user tries to get another user\'s profile', async () => {
      const res = await request(app)
        .get(`/api/v1/users/${adminUser.id}`) // Normal user trying to get admin profile
        .set('Authorization', `Bearer ${normalUserAccessToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Forbidden: You can only view your own profile.');
    });

    it('should return 404 for a non-existent user', async () => {
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const res = await request(app)
        .get(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('User not found.');
    });
  });

  // --- PATCH /api/v1/users/:userId ---
  describe('PATCH /api/v1/users/:userId', () => {
    it('should allow a user to update their own profile (firstName, lastName)', async () => {
      const updateData = { firstName: 'Updated', lastName: 'User' };
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('User updated successfully.');
      expect(res.body.user.firstName).toBe(updateData.firstName);
      expect(res.body.user.lastName).toBe(updateData.lastName);

      const updatedUser = await userRepository.findOneBy({ id: normalUser.id });
      expect(updatedUser?.firstName).toBe(updateData.firstName);
    });

    it('should allow admin to update any user profile including role', async () => {
      const updateData = { firstName: 'AdminChanged', email: 'adminchanged@test.com', roleId: (await roleRepository.findOneBy({ name: UserRole.ADMIN }))?.id };
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('User updated successfully.');
      expect(res.body.user.firstName).toBe(updateData.firstName);
      expect(res.body.user.email).toBe(updateData.email);
      expect(res.body.user.role).toBe(UserRole.ADMIN); // Role changed

      const updatedUser = await userRepository.findOne({ where: { id: normalUser.id }, relations: ['role'] });
      expect(updatedUser?.firstName).toBe(updateData.firstName);
      expect(updatedUser?.email).toBe(updateData.email);
      expect(updatedUser?.role.name).toBe(UserRole.ADMIN);
      // Reset normalUser's role for subsequent tests
      normalUser.role = (await roleRepository.findOneBy({ name: UserRole.USER }))!;
      normalUser.roleId = normalUser.role.id;
      normalUser.email = 'user@test.com'; // Reset email too
      await userRepository.save(normalUser);
    });

    it('should return 403 if a user tries to update another user\'s profile', async () => {
      const updateData = { firstName: 'Hacker' };
      const res = await request(app)
        .patch(`/api/v1/users/${adminUser.id}`) // Normal user trying to update admin profile
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to update this user.');
    });

    it('should return 403 if a non-admin user tries to change role', async () => {
      const adminRole = await roleRepository.findOneBy({ name: UserRole.ADMIN });
      const updateData = { roleId: adminRole?.id };
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to change user roles.');
    });

    it('should return 409 if updating email to one already in use', async () => {
      const updateData = { email: adminUser.email }; // Try to set normal user's email to admin's
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send(updateData);

      expect(res.statusCode).toEqual(409);
      expect(res.body.message).toBe('Email already in use by another user.');
    });

    it('should return 400 for invalid update data', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send({ email: 'invalid-email' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/Email must be a valid email/);
    });
  });

  // --- DELETE /api/v1/users/:userId --- (Admin only)
  describe('DELETE /api/v1/users/:userId', () => {
    let userToDelete: User;
    beforeEach(async () => {
      const userRole = await roleRepository.findOneBy({ name: UserRole.USER });
      userToDelete = userRepository.create({
        firstName: 'Delete', lastName: 'Me', email: 'delete@test.com',
        password: await hashPassword('DeleteMe123!'), isEmailVerified: true, role: userRole,
      });
      await userRepository.save(userToDelete);
    });

    it('should allow admin to delete a user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('User deleted successfully.');

      const deletedUser = await userRepository.findOneBy({ id: userToDelete.id });
      expect(deletedUser).toBeNull();
    });

    it('should return 403 if a normal user tries to delete any user', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to delete this user or cannot delete yourself.');
    });

    it('should return 403 if admin tries to delete themselves', async () => {
      const res = await request(app)
        .delete(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('You do not have permission to delete this user or cannot delete yourself.');
    });

    it('should return 404 for non-existent user deletion', async () => {
      const nonExistentId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
      const res = await request(app)
        .delete(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body.message).toBe('User not found.');
    });
  });

  // --- PATCH /api/v1/users/:userId/change-password ---
  describe('PATCH /api/v1/users/:userId/change-password', () => {
    it('should allow a user to change their own password', async () => {
      const newPassword = 'NewUserPassword123!';
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}/change-password`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send({ currentPassword: 'UserPassword123!', newPassword });

      expect(res.statusCode).toEqual(200);
      expect(res.body.message).toBe('Password changed successfully.');

      // Try logging in with new password
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: normalUser.email,
        password: newPassword,
      });
      expect(loginRes.statusCode).toEqual(200);
      expect(loginRes.body.user.email).toBe(normalUser.email);

      // Restore password for other tests
      normalUser.password = await hashPassword('UserPassword123!');
      await userRepository.save(normalUser);
    });

    it('should return 400 for incorrect current password', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}/change-password`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send({ currentPassword: 'WrongPassword!', newPassword: 'NewPassword123!' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toBe('Current password is incorrect.');
    });

    it('should return 403 if a user tries to change another user\'s password', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${adminUser.id}/change-password`) // Normal user trying to change admin password
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send({ currentPassword: 'AdminPassword123!', newPassword: 'NewPassword123!' });

      expect(res.statusCode).toEqual(403);
      expect(res.body.message).toBe('Forbidden: You can only change your own password.');
    });

    it('should return 400 for invalid new password', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${normalUser.id}/change-password`)
        .set('Authorization', `Bearer ${normalUserAccessToken}`)
        .send({ currentPassword: 'UserPassword123!', newPassword: 'short' });

      expect(res.statusCode).toEqual(400);
      expect(res.body.message).toMatch(/Password must be at least 8 characters long/);
    });
  });
});
```