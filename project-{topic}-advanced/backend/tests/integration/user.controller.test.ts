```typescript
import request from 'supertest';
import app from '../../src/app';
import { AppDataSource } from '../../src/database/config/data-source';
import { User, UserRole } from '../../src/database/entities/User';
import * as bcrypt from 'bcryptjs';
import { sign } from 'jsonwebtoken';
import { env } from '../../src/config/env.config';
import { Repository } from 'typeorm';

// This test suite requires a running database connection.
// Ensure your test database is set up and configured in .env for `NODE_ENV=test`.
// The `npm test` script in package.json handles migration and seeding.

describe('UserController (Integration Tests)', () => {
  let userRepository: Repository<User>;
  let adminUser: User;
  let regularUser: User;
  let adminAccessToken: string;
  let regularUserAccessToken: string;

  beforeAll(async () => {
    await AppDataSource.initialize();
    userRepository = AppDataSource.getRepository(User);

    // Ensure seed data is present or create directly for tests
    const hashedPassword = await bcrypt.hash('Password123!', 10);

    adminUser = await userRepository.save(userRepository.create({
      username: 'testadmin',
      email: 'testadmin@test.com',
      password: hashedPassword,
      role: UserRole.ADMIN,
    }));

    regularUser = await userRepository.save(userRepository.create({
      username: 'testuser',
      email: 'testuser@test.com',
      password: hashedPassword,
      role: UserRole.USER,
    }));

    adminAccessToken = sign({ userId: adminUser.id, email: adminUser.email, role: adminUser.role }, env.JWT_SECRET, { expiresIn: '1h' });
    regularUserAccessToken = sign({ userId: regularUser.id, email: regularUser.email, role: regularUser.role }, env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll(async () => {
    // Clean up test data
    await userRepository.delete({ id: adminUser.id });
    await userRepository.delete({ id: regularUser.id });
    await AppDataSource.destroy();
  });

  describe('GET /api/v1/users', () => {
    it('should return 200 and all users for an admin', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(2); // At least admin and regular user
      expect(response.body[0]).not.toHaveProperty('password'); // Ensure password is not exposed
    });

    it('should return 403 for a regular user trying to get all users', async () => {
      const response = await request(app)
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${regularUserAccessToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: You do not have the necessary permissions');
    });

    it('should return 401 for an unauthenticated user', async () => {
      const response = await request(app).get('/api/v1/users');
      expect(response.statusCode).toBe(401);
      expect(response.body.message).toBe('Authentication token required');
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 200 and user details for authenticated user fetching their own profile', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(regularUser.id);
      expect(response.body.email).toBe(regularUser.email);
      expect(response.body).not.toHaveProperty('password');
    });

    it('should return 200 and user details for admin fetching any user profile', async () => {
      const response = await request(app)
        .get(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.id).toBe(regularUser.id);
      expect(response.body.email).toBe(regularUser.email);
    });

    it('should return 404 for a non-existent user ID', async () => {
      const nonExistentId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'; // A valid UUID format, but non-existent
      const response = await request(app)
        .get(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    it('should allow a user to update their own username', async () => {
      const newUsername = 'updateduser';
      const response = await request(app)
        .patch(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({ username: newUsername });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.user.username).toBe(newUsername);

      const updated = await userRepository.findOneBy({ id: regularUser.id });
      expect(updated?.username).toBe(newUsername);
      regularUser.username = newUsername; // Update local user object for subsequent tests
    });

    it('should not allow a regular user to update another user\'s profile', async () => {
      const response = await request(app)
        .patch(`/api/v1/users/${adminUser.id}`) // Regular user tries to update admin
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({ username: 'anotheruser' });

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: You can only update your own profile');
    });

    it('should allow an admin to update another user\'s role', async () => {
      const response = await request(app)
        .patch(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`)
        .send({ role: UserRole.ADMIN });

      expect(response.statusCode).toBe(200);
      expect(response.body.message).toBe('User updated successfully');
      expect(response.body.user.role).toBe(UserRole.ADMIN);

      const updated = await userRepository.findOneBy({ id: regularUser.id });
      expect(updated?.role).toBe(UserRole.ADMIN);
      regularUser.role = UserRole.ADMIN; // Update for subsequent tests
    });

    it('should return 400 for invalid update data', async () => {
      const response = await request(app)
        .patch(`/api/v1/users/${regularUser.id}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`)
        .send({ email: 'invalid-email' }); // Invalid email format

      expect(response.statusCode).toBe(400);
      expect(response.body.message).toBe('Validation failed');
      expect(response.body.errors[0].field).toBe('email');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    let userToDelete: User;
    beforeEach(async () => {
      // Create a new user for each delete test to ensure isolation
      const hashedPassword = await bcrypt.hash('DeleteMe123!', 10);
      userToDelete = await userRepository.save(userRepository.create({
        username: 'todelete',
        email: 'todelete@test.com',
        password: hashedPassword,
        role: UserRole.USER,
      }));
    });

    it('should allow an admin to delete a user', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.statusCode).toBe(204);
      const deletedUser = await userRepository.findOneBy({ id: userToDelete.id });
      expect(deletedUser).toBeNull();
    });

    it('should return 403 if admin tries to delete themselves', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${adminUser.id}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: You cannot delete your own admin account');
    });

    it('should return 403 for a regular user trying to delete a user', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${regularUserAccessToken}`); // regularUser now an ADMIN

      expect(response.statusCode).toBe(403);
      expect(response.body.message).toBe('Forbidden: You do not have the necessary permissions');
    });

    it('should return 404 for deleting a non-existent user', async () => {
      const nonExistentId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const response = await request(app)
        .delete(`/api/v1/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminAccessToken}`);

      expect(response.statusCode).toBe(404);
      expect(response.body.message).toBe('User not found');
    });
  });
});
```
*Note: A similar structure would be followed for `project.controller.test.ts` and `task.controller.test.ts` to achieve higher coverage.*

#### Frontend Tests (Jest, React Testing Library)