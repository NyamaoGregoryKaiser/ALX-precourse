import request from 'supertest';
import { app } from '../../src/app';
import { AppDataSource } from '../../src/db/data-source';
import { User, UserRole } from '../../src/entities/User';
import * as bcrypt from 'bcryptjs';
import { generateToken } from '../../src/utils/jwt';
import { config } from '../../src/config';

describe('User API (CRUD operations)', () => {
  let adminUser: User;
  let regularUser: User;
  let adminToken: string;
  let regularToken: string;

  beforeAll(async () => {
    await AppDataSource.synchronize(true); // Clear and re-create tables
    console.log("API test: DB synchronized (cleared)");

    adminUser = AppDataSource.getRepository(User).create({
      username: 'admin_api',
      email: 'admin_api@example.com',
      password_hash: await bcrypt.hash('adminpassword', 10),
      role: UserRole.ADMIN,
    });
    await AppDataSource.getRepository(User).save(adminUser);
    adminToken = generateToken({ id: adminUser.id, role: adminUser.role });

    regularUser = AppDataSource.getRepository(User).create({
      username: 'user_api',
      email: 'user_api@example.com',
      password_hash: await bcrypt.hash('userpassword', 10),
      role: UserRole.USER,
    });
    await AppDataSource.getRepository(User).save(regularUser);
    regularToken = generateToken({ id: regularUser.id, role: regularUser.role });

    console.log("API test: Users and tokens created.");
  });

  afterAll(async () => {
    // Clean up created users
    await AppDataSource.getRepository(User).clear(); // Faster than individual removes
    console.log("API test: Users cleaned up.");
    await AppDataSource.destroy();
  });

  describe('GET /api/users', () => {
    it('should allow admin to get all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2); // admin and regular
      expect(response.body[0]).not.toHaveProperty('password_hash');
    });

    it('should deny regular user access to all users', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: Insufficient permissions');
    });

    it('should deny access without a token', async () => {
      const response = await request(app).get('/api/users');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Authentication required');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should allow admin to get any user by ID', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(regularUser.id);
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should allow a regular user to get their own profile', async () => {
      const response = await request(app)
        .get(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(regularUser.id);
      expect(response.body).not.toHaveProperty('password_hash');
    });

    it('should deny a regular user from getting another user\'s profile', async () => {
      const response = await request(app)
        .get(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: Insufficient permissions');
    });

    it('should return 404 for a non-existent user ID', async () => {
      const response = await request(app)
        .get('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should allow admin to update any user', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ username: 'updated_regular_user' });

      expect(response.statusCode).toBe(200);
      expect(response.body.username).toBe('updated_regular_user');

      const updatedUser = await AppDataSource.getRepository(User).findOneBy({ id: regularUser.id });
      expect(updatedUser?.username).toBe('updated_regular_user');
      regularUser.username = 'updated_regular_user'; // Keep state consistent
    });

    it('should allow a regular user to update their own profile', async () => {
      const response = await request(app)
        .put(`/api/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ email: 'updated_user_api@example.com' });

      expect(response.statusCode).toBe(200);
      expect(response.body.email).toBe('updated_user_api@example.com');

      const updatedUser = await AppDataSource.getRepository(User).findOneBy({ id: regularUser.id });
      expect(updatedUser?.email).toBe('updated_user_api@example.com');
      regularUser.email = 'updated_user_api@example.com'; // Keep state consistent
    });

    it('should deny a regular user from updating another user\'s profile', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${regularToken}`)
        .send({ username: 'attempted_update' });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: Insufficient permissions');
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .put(`/api/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: 'invalid-email' }); // Invalid email format

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toContain('email must be a valid email');
    });
  });

  describe('DELETE /api/users/:id', () => {
    let userToDelete: User;
    let userToDeleteToken: string;

    beforeEach(async () => {
      userToDelete = AppDataSource.getRepository(User).create({
        username: 'to_delete',
        email: 'to_delete@example.com',
        password_hash: await bcrypt.hash('deletepass', 10),
        role: UserRole.USER,
      });
      await AppDataSource.getRepository(User).save(userToDelete);
      userToDeleteToken = generateToken({ id: userToDelete.id, role: userToDelete.role });
    });

    it('should allow admin to delete any user', async () => {
      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.statusCode).toBe(204); // No Content

      const deletedUser = await AppDataSource.getRepository(User).findOneBy({ id: userToDelete.id });
      expect(deletedUser).toBeNull();
    });

    it('should deny regular user from deleting any user', async () => {
      const response = await request(app)
        .delete(`/api/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${regularToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: Insufficient permissions');

      const userStillExists = await AppDataSource.getRepository(User).findOneBy({ id: userToDelete.id });
      expect(userStillExists).not.toBeNull();
    });

    it('should return 404 for deleting a non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });
});
```

#### Performance Tests (Artillery Configuration Example - not executable code)
```yaml